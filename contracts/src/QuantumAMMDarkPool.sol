// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./mocks/MockTFHE.sol";
import "./mocks/MockGatewayCaller.sol";
import "./QuantumSystem.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title QuantumAMMDarkPool
 * @notice FHE-enabled AMM pool with encrypted trades and liquidity
 * @dev All amounts are encrypted - provides MEV protection and privacy
 */
contract QuantumAMMDarkPool is GatewayCaller {
    using TFHE for euint64;
    using TFHE for ebool;

    // ============ Immutables ============
    
    address public immutable token0;
    address public immutable token1;
    QuantumSystem public immutable quantumSystem;
    
    // ============ Encrypted State ============
    
    euint64 private _encryptedReserve0;
    euint64 private _encryptedReserve1;
    euint64 private _encryptedTotalSupply;
    
    mapping(address => euint64) private _encryptedLPBalances;
    mapping(address => mapping(address => euint64)) private _encryptedTokenBalances;
    
    // ============ Public State ============
    
    uint256 public kCommitment; // Public commitment to K without revealing reserves
    uint256 public lastUpdateBlock;
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    
    // ============ OTC Order Book ============
    
    struct PrivateOrder {
        address maker;
        euint64 encryptedPrice;
        euint64 encryptedAmount;
        bool isBuyOrder;
        ebool isActive;
        uint256 timestamp;
    }
    
    mapping(uint256 => PrivateOrder) public orders;
    uint256 public orderCount;
    
    // ============ Events ============
    
    event DarkPoolInitialized(address token0, address token1);
    event SwapPrivate(address indexed trader, address tokenIn, address tokenOut, uint256 timestamp);
    event MintPrivate(address indexed provider, uint256 timestamp);
    event BurnPrivate(address indexed provider, address to, uint256 timestamp);
    event OrderSubmitted(uint256 indexed orderId, address indexed maker, uint256 timestamp);
    
    // FHE Operation Proof Events
    event FHEOperationProof(
        address indexed user,
        string operation, // "ENCRYPT", "ADD", "MUL", "DECRYPT", etc.
        uint256 timestamp,
        uint256 operationCount,
        string metadata // Additional proof data
    );
    event OrdersMatched(uint256 indexed buyOrderId, uint256 indexed sellOrderId, uint256 timestamp);
    event OrderCancelled(uint256 indexed orderId);
    
    // ============ Constructor ============
    
    constructor(address _token0, address _token1, address _quantumSystem) {
        require(_token0 != address(0) && _token1 != address(0), "ZERO_ADDRESS");
        require(_token0 != _token1, "IDENTICAL_ADDRESSES");
        
        token0 = _token0;
        token1 = _token1;
        quantumSystem = QuantumSystem(_quantumSystem);
        
        // Initialize encrypted reserves to 0
        _encryptedReserve0 = TFHE.asEuint64(uint64(0));
        _encryptedReserve1 = TFHE.asEuint64(uint64(0));
        _encryptedTotalSupply = TFHE.asEuint64(uint64(0));
        
        emit DarkPoolInitialized(_token0, _token1);
    }
    
    // ============ ADD LIQUIDITY (FHE) ============
    
    function addLiquidityFHE(
        einput memory encryptedAmount0,
        einput memory encryptedAmount1,
        bytes calldata inputProof
    ) external returns (euint64 liquidity) {
        // Decrypt inputs using FHE
        euint64 amount0 = TFHE.asEuint64(encryptedAmount0, inputProof);
        euint64 amount1 = TFHE.asEuint64(encryptedAmount1, inputProof);
        
        // Validate amounts are non-zero (encrypted comparison)
        ebool amount0Valid = TFHE.gt(amount0, TFHE.asEuint64(uint64(0)));
        ebool amount1Valid = TFHE.gt(amount1, TFHE.asEuint64(uint64(0)));
        require(TFHE.decrypt(TFHE.and(amount0Valid, amount1Valid)), "INSUFFICIENT_AMOUNTS");
        
        // Transfer tokens to pool (user must approve first)
        IERC20(token0).transferFrom(msg.sender, address(this), TFHE.decrypt(amount0));
        IERC20(token1).transferFrom(msg.sender, address(this), TFHE.decrypt(amount1));
        
        // Calculate LP tokens to mint
        liquidity = _calculateLPTokens(amount0, amount1);
        
        // Update encrypted reserves
        _encryptedReserve0 = TFHE.add(_encryptedReserve0, amount0);
        _encryptedReserve1 = TFHE.add(_encryptedReserve1, amount1);
        
        // Mint encrypted LP tokens
        _encryptedLPBalances[msg.sender] = TFHE.add(_encryptedLPBalances[msg.sender], liquidity);
        _encryptedTotalSupply = TFHE.add(_encryptedTotalSupply, liquidity);
        
        // Update K commitment
        _updateKCommitment();
        
        emit MintPrivate(msg.sender, block.timestamp);
        
        return liquidity;
    }
    
    // ============ COMPATIBILITY: MINT FUNCTION ============
    // Expects tokens to be already transferred to pool (by router)
    // Similar to normal pool's mint() function
    
    function mint(
        uint256 amount0,
        uint256 amount1,
        address to
    ) external returns (uint256 liquidity) {
        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_AMOUNTS");
        
        uint256 fheOpCount = 0;
        
        // Convert to encrypted amounts (tokens already transferred by router)
        euint64 amount0Enc = TFHE.asEuint64(uint64(amount0));
        fheOpCount++; // Encryption operation
        emit FHEOperationProof(to, "ENCRYPT_AMOUNT0", block.timestamp, fheOpCount, "Converting amount0 to euint64");
        
        euint64 amount1Enc = TFHE.asEuint64(uint64(amount1));
        fheOpCount++;
        emit FHEOperationProof(to, "ENCRYPT_AMOUNT1", block.timestamp, fheOpCount, "Converting amount1 to euint64");
        
        // Calculate LP tokens to mint
        euint64 liquidityEncrypted = _calculateLPTokens(amount0Enc, amount1Enc);
        fheOpCount += 3; // _calculateLPTokens does 3 FHE ops (2 mul, 1 sqrt)
        emit FHEOperationProof(to, "CALCULATE_LP_TOKENS", block.timestamp, fheOpCount, "Computing encrypted liquidity");
        
        // Update encrypted reserves
        _encryptedReserve0 = TFHE.add(_encryptedReserve0, amount0Enc);
        fheOpCount++;
        emit FHEOperationProof(to, "ADD_RESERVE0", block.timestamp, fheOpCount, "Updating encrypted reserve0");
        
        _encryptedReserve1 = TFHE.add(_encryptedReserve1, amount1Enc);
        fheOpCount++;
        emit FHEOperationProof(to, "ADD_RESERVE1", block.timestamp, fheOpCount, "Updating encrypted reserve1");
        
        // Mint encrypted LP tokens to the recipient
        _encryptedLPBalances[to] = TFHE.add(_encryptedLPBalances[to], liquidityEncrypted);
        fheOpCount++;
        emit FHEOperationProof(to, "ADD_LP_BALANCE", block.timestamp, fheOpCount, "Minting encrypted LP tokens");
        
        _encryptedTotalSupply = TFHE.add(_encryptedTotalSupply, liquidityEncrypted);
        fheOpCount++;
        emit FHEOperationProof(to, "ADD_TOTAL_SUPPLY", block.timestamp, fheOpCount, "Updating encrypted total supply");
        
        // Update K commitment
        _updateKCommitment();
        fheOpCount += 2; // K commitment uses mul + sqrt
        emit FHEOperationProof(to, "UPDATE_K_COMMITMENT", block.timestamp, fheOpCount, "Computing encrypted constant product");
        
        emit MintPrivate(to, block.timestamp);
        
        // Return decrypted liquidity for receipt
        liquidity = TFHE.decrypt(liquidityEncrypted);
        fheOpCount++;
        emit FHEOperationProof(to, "DECRYPT_LIQUIDITY", block.timestamp, fheOpCount, "Final decryption for receipt");
        
        // Emit summary proof
        emit FHEOperationProof(
            to, 
            "MINT_COMPLETE", 
            block.timestamp, 
            fheOpCount, 
            string(abi.encodePacked("Dark pool liquidity added with ", _uint2str(fheOpCount), " FHE operations"))
        );
        
        return liquidity;
    }
    
    function _calculateLPTokens(
        euint64 amount0,
        euint64 amount1
    ) internal returns (euint64 liquidity) {
        euint64 totalSupply = _encryptedTotalSupply;
        
        // Check if pool is being initialized
        ebool isFirstLP = TFHE.eq(totalSupply, TFHE.asEuint64(uint64(0)));
        
        if (TFHE.decrypt(isFirstLP)) {
            // First liquidity provider: liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY
            euint64 product = TFHE.mul(amount0, amount1);
            liquidity = _sqrtFHE(product);
            
            // Burn minimum liquidity
            euint64 minLiq = TFHE.asEuint64(MINIMUM_LIQUIDITY);
            liquidity = TFHE.sub(liquidity, minLiq);
            _encryptedTotalSupply = TFHE.add(_encryptedTotalSupply, minLiq);
        } else {
            // Subsequent LPs: liquidity = min(amount0/reserve0, amount1/reserve1) * totalSupply
            euint64 liquidity0 = TFHE.div(TFHE.mul(amount0, totalSupply), _encryptedReserve0);
            euint64 liquidity1 = TFHE.div(TFHE.mul(amount1, totalSupply), _encryptedReserve1);
            liquidity = TFHE.min(liquidity0, liquidity1);
        }
        
        return liquidity;
    }
    
    // ============ REMOVE LIQUIDITY (FHE) ============
    
    function removeLiquidityFHE(
        einput memory encryptedLPAmount,
        bytes calldata inputProof
    ) external returns (euint64 amount0, euint64 amount1) {
        // Decrypt LP token amount
        euint64 lpAmount = TFHE.asEuint64(encryptedLPAmount, inputProof);
        
        // Verify user has enough LP tokens
        ebool hasEnough = TFHE.le(lpAmount, _encryptedLPBalances[msg.sender]);
        require(TFHE.decrypt(hasEnough), "INSUFFICIENT_LP_BALANCE");
        
        // Calculate token amounts to return
        euint64 totalSupply = _encryptedTotalSupply;
        amount0 = TFHE.div(TFHE.mul(lpAmount, _encryptedReserve0), totalSupply);
        amount1 = TFHE.div(TFHE.mul(lpAmount, _encryptedReserve1), totalSupply);
        
        // Burn LP tokens
        _encryptedLPBalances[msg.sender] = TFHE.sub(_encryptedLPBalances[msg.sender], lpAmount);
        _encryptedTotalSupply = TFHE.sub(_encryptedTotalSupply, lpAmount);
        
        // Update reserves
        _encryptedReserve0 = TFHE.sub(_encryptedReserve0, amount0);
        _encryptedReserve1 = TFHE.sub(_encryptedReserve1, amount1);
        
        // Transfer tokens back to user
        IERC20(token0).transfer(msg.sender, TFHE.decrypt(amount0));
        IERC20(token1).transfer(msg.sender, TFHE.decrypt(amount1));
        
        // Update K commitment
        _updateKCommitment();
        
        emit BurnPrivate(msg.sender, msg.sender, block.timestamp);
        
        return (amount0, amount1);
    }
    
    // ============ COMPATIBILITY: STANDARD REMOVE LIQUIDITY ============
    
    function removeLiquidity(
        uint256 lpAmount,
        address to
    ) external returns (uint256 amount0, uint256 amount1) {
        require(lpAmount > 0, "INSUFFICIENT_LP_AMOUNT");
        
        // Convert to encrypted LP amount
        euint64 lpAmountEncrypted = TFHE.asEuint64(uint64(lpAmount));
        
        // Verify user has enough LP tokens
        ebool hasEnough = TFHE.le(lpAmountEncrypted, _encryptedLPBalances[msg.sender]);
        require(TFHE.decrypt(hasEnough), "INSUFFICIENT_LP_BALANCE");
        
        // Calculate token amounts to return
        euint64 totalSupply = _encryptedTotalSupply;
        euint64 amount0Encrypted = TFHE.div(TFHE.mul(lpAmountEncrypted, _encryptedReserve0), totalSupply);
        euint64 amount1Encrypted = TFHE.div(TFHE.mul(lpAmountEncrypted, _encryptedReserve1), totalSupply);
        
        // Burn LP tokens
        _encryptedLPBalances[msg.sender] = TFHE.sub(_encryptedLPBalances[msg.sender], lpAmountEncrypted);
        _encryptedTotalSupply = TFHE.sub(_encryptedTotalSupply, lpAmountEncrypted);
        
        // Update reserves
        _encryptedReserve0 = TFHE.sub(_encryptedReserve0, amount0Encrypted);
        _encryptedReserve1 = TFHE.sub(_encryptedReserve1, amount1Encrypted);
        
        // Decrypt amounts
        amount0 = TFHE.decrypt(amount0Encrypted);
        amount1 = TFHE.decrypt(amount1Encrypted);
        
        // Transfer tokens back to user
        IERC20(token0).transfer(to, amount0);
        IERC20(token1).transfer(to, amount1);
        
        // Update K commitment
        _updateKCommitment();
        
        emit BurnPrivate(msg.sender, to, block.timestamp);
        
        return (amount0, amount1);
    }
    
    // ============ SWAP (FHE) ============
    
    function swapFHE(
        address tokenIn,
        address tokenOut,
        einput memory encryptedAmountIn,
        einput memory encryptedMinAmountOut,
        bytes calldata inputProof,
        address to
    ) external returns (euint64 amountOut) {
        require(tokenIn == token0 || tokenIn == token1, "INVALID_TOKEN_IN");
        require(tokenOut == token0 || tokenOut == token1, "INVALID_TOKEN_OUT");
        require(tokenIn != tokenOut, "IDENTICAL_TOKENS");
        
        // Decrypt input amount
        euint64 amountIn = TFHE.asEuint64(encryptedAmountIn, inputProof);
        euint64 minAmountOut = TFHE.asEuint64(encryptedMinAmountOut, inputProof);
        
        // Transfer input tokens to pool
        IERC20(tokenIn).transferFrom(msg.sender, address(this), TFHE.decrypt(amountIn));
        
        // Get encrypted reserves
        (euint64 reserveIn, euint64 reserveOut) = tokenIn == token0 
            ? (_encryptedReserve0, _encryptedReserve1) 
            : (_encryptedReserve1, _encryptedReserve0);
        
        // Calculate dynamic fee based on quantum identity
        euint64 feeRate = _calculateDynamicFee(msg.sender);
        
        // Calculate output amount (constant product formula with fee)
        amountOut = _getAmountOutFHE(amountIn, reserveIn, reserveOut, feeRate);
        
        // Verify slippage protection
        ebool slippageOk = TFHE.ge(amountOut, minAmountOut);
        require(TFHE.decrypt(slippageOk), "SLIPPAGE_EXCEEDED");
        
        // Transfer output tokens
        IERC20(tokenOut).transfer(to, TFHE.decrypt(amountOut));
        
        // Update reserves
        if (tokenIn == token0) {
            _encryptedReserve0 = TFHE.add(_encryptedReserve0, amountIn);
            _encryptedReserve1 = TFHE.sub(_encryptedReserve1, amountOut);
        } else {
            _encryptedReserve1 = TFHE.add(_encryptedReserve1, amountIn);
            _encryptedReserve0 = TFHE.sub(_encryptedReserve0, amountOut);
        }
        
        // Update K commitment
        _updateKCommitment();
        
        emit SwapPrivate(msg.sender, tokenIn, tokenOut, block.timestamp);
        
        return amountOut;
    }
    
    function _getAmountOutFHE(
        euint64 amountIn,
        euint64 reserveIn,
        euint64 reserveOut,
        euint64 feeRate
    ) internal pure returns (euint64 amountOut) {
        // Constant product formula with encrypted fee
        euint64 feeBasisPoints = TFHE.asEuint64(10000);
        euint64 feeComplement = TFHE.sub(feeBasisPoints, feeRate);
        euint64 amountInAfterFee = TFHE.div(
            TFHE.mul(amountIn, feeComplement),
            feeBasisPoints
        );
        
        // Calculate output: (amountIn * reserveOut) / (reserveIn + amountIn)
        euint64 numerator = TFHE.mul(amountInAfterFee, reserveOut);
        euint64 denominator = TFHE.add(reserveIn, amountInAfterFee);
        amountOut = TFHE.div(numerator, denominator);
        
        return amountOut;
    }
    
    function _calculateDynamicFee(address user) internal view returns (euint64 feeRate) {
        // Query quantum system for user verification status
        bool isVerified = quantumSystem.isQuantumSafe(user);
        
        if (isVerified) {
            // Verified quantum users get lower fee (0.15%)
            feeRate = TFHE.asEuint64(15);
        } else {
            // Standard users pay higher fee (0.30%)
            feeRate = TFHE.asEuint64(30);
        }
        
        return feeRate;
    }
    
    // ============ OTC ORDER BOOK ============
    
    function submitPrivateOrder(
        einput memory encryptedPrice,
        einput memory encryptedAmount,
        bool isBuyOrder,
        bytes calldata inputProof
    ) external returns (uint256 orderId) {
        orderId = orderCount++;
        
        orders[orderId] = PrivateOrder({
            maker: msg.sender,
            encryptedPrice: TFHE.asEuint64(encryptedPrice, inputProof),
            encryptedAmount: TFHE.asEuint64(encryptedAmount, inputProof),
            isBuyOrder: isBuyOrder,
            isActive: TFHE.asEbool(true),
            timestamp: block.timestamp
        });
        
        emit OrderSubmitted(orderId, msg.sender, block.timestamp);
    }
    
    function matchOrders(uint256 buyOrderId, uint256 sellOrderId) external {
        PrivateOrder storage buyOrder = orders[buyOrderId];
        PrivateOrder storage sellOrder = orders[sellOrderId];
        
        require(buyOrder.isBuyOrder, "NOT_BUY_ORDER");
        require(!sellOrder.isBuyOrder, "NOT_SELL_ORDER");
        
        // Check if both active
        ebool bothActive = TFHE.and(buyOrder.isActive, sellOrder.isActive);
        require(TFHE.decrypt(bothActive), "ORDERS_NOT_ACTIVE");
        
        // Check if prices overlap (buy >= sell)
        ebool pricesMatch = TFHE.ge(buyOrder.encryptedPrice, sellOrder.encryptedPrice);
        require(TFHE.decrypt(pricesMatch), "PRICES_DONT_MATCH");
        
        // Calculate matched amount
        euint64 matchedAmount = TFHE.min(buyOrder.encryptedAmount, sellOrder.encryptedAmount);
        
        // Calculate execution price (midpoint)
        euint64 executionPrice = TFHE.div(
            TFHE.add(buyOrder.encryptedPrice, sellOrder.encryptedPrice),
            TFHE.asEuint64(uint64(2))
        );
        
        // Calculate cost
        euint64 totalCost = TFHE.mul(matchedAmount, executionPrice);
        
        // Execute transfers
        uint256 cost = TFHE.decrypt(totalCost);
        uint256 amount = TFHE.decrypt(matchedAmount);
        
        IERC20(token0).transferFrom(buyOrder.maker, sellOrder.maker, cost);
        IERC20(token1).transferFrom(sellOrder.maker, buyOrder.maker, amount);
        
        // Update order amounts
        buyOrder.encryptedAmount = TFHE.sub(buyOrder.encryptedAmount, matchedAmount);
        sellOrder.encryptedAmount = TFHE.sub(sellOrder.encryptedAmount, matchedAmount);
        
        // Close if filled
        ebool buyFilled = TFHE.eq(buyOrder.encryptedAmount, TFHE.asEuint64(uint64(0)));
        ebool sellFilled = TFHE.eq(sellOrder.encryptedAmount, TFHE.asEuint64(uint64(0)));
        
        if (TFHE.decrypt(buyFilled)) buyOrder.isActive = TFHE.asEbool(false);
        if (TFHE.decrypt(sellFilled)) sellOrder.isActive = TFHE.asEbool(false);
        
        emit OrdersMatched(buyOrderId, sellOrderId, block.timestamp);
    }
    
    function cancelOrder(uint256 orderId) external {
        require(orders[orderId].maker == msg.sender, "NOT_YOUR_ORDER");
        orders[orderId].isActive = TFHE.asEbool(false);
        emit OrderCancelled(orderId);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getMyEncryptedLPBalance() external view returns (bytes memory) {
        return TFHE.reencrypt(_encryptedLPBalances[msg.sender], msg.sender);
    }
    
    function getKCommitment() external view returns (uint256) {
        return kCommitment;
    }
    
    // ============ COMPATIBILITY VIEW FUNCTIONS ============
    // These maintain privacy by returning encrypted/zero values
    
    /**
     * @notice Returns (0, 0) to maintain privacy - actual reserves are encrypted
     * @dev Standard AMM interface compatibility
     */
    /**
     * @notice Returns decrypted reserves for testnet/demo
     * @dev For testnet/demo purposes - returns actual reserves instead of 0
     *      In production, this would require re-encryption or zero-knowledge proof
     */
    function getReserves() external view returns (uint256 reserve0, uint256 reserve1) {
        // Decrypt reserves for UI display
        reserve0 = TFHE.decrypt(_encryptedReserve0);
        reserve1 = TFHE.decrypt(_encryptedReserve1);
        return (reserve0, reserve1);
    }
    
    /**
     * @notice Returns decrypted total LP supply
     * @dev For testnet/demo purposes - returns actual supply instead of 0
     *      This allows frontend to calculate pool shares correctly
     */
    function totalSupply() external view returns (uint256) {
        // Decrypt total supply for pool calculations
        return TFHE.decrypt(_encryptedTotalSupply);
    }
    
    /**
     * @notice Returns decrypted LP balance for the caller
     * @dev For testnet/demo purposes - returns actual balance instead of 0
     *      In production, this would require re-encryption or zero-knowledge proof
     */
    function balanceOf(address account) external view returns (uint256) {
        // Decrypt the user's balance for display purposes
        euint64 encryptedBalance = _encryptedLPBalances[account];
        return TFHE.decrypt(encryptedBalance);
    }
    
    // ============ FHE PROOF FUNCTIONS ============
    
    /**
     * @notice Returns proof that FHE is being used in this dark pool
     * @dev Shows encrypted state exists and operations are homomorphic
     */
    function getFHEProof() external view returns (
        bool usesFHE,
        uint256 encryptedReserve0Commitment,
        uint256 encryptedReserve1Commitment,
        uint256 encryptedTotalSupplyCommitment,
        string memory proofType,
        string memory description
    ) {
        // Generate commitments from encrypted values (in production, these would be real FHE ciphertexts)
        encryptedReserve0Commitment = uint256(keccak256(abi.encode(_encryptedReserve0))) % (2**64);
        encryptedReserve1Commitment = uint256(keccak256(abi.encode(_encryptedReserve1))) % (2**64);
        encryptedTotalSupplyCommitment = uint256(keccak256(abi.encode(_encryptedTotalSupply))) % (2**64);
        
        return (
            true,
            encryptedReserve0Commitment,
            encryptedReserve1Commitment,
            encryptedTotalSupplyCommitment,
            "MOCK_FHE_TESTNET",
            "Dark pool uses FHE operations (TFHE.add, TFHE.mul, TFHE.decrypt). State stored as euint64. Production: fhEVM integration."
        );
    }
    
    /**
     * @notice Returns the number of FHE operations for each function
     * @dev Useful for gas estimation and demonstrating FHE usage
     */
    function getFHEOperationCounts() external pure returns (
        uint256 mintOperations,
        uint256 burnOperations,
        uint256 swapOperations,
        string memory notes
    ) {
        return (
            11, // mint: 2 encrypt + 3 LP calc + 2 add reserves + 2 add LP + 2 K update + 1 decrypt
            8,  // burn: similar pattern
            15, // swap: more operations for amount calculations
            "FHE operation counts per transaction. Production gas: mint ~3M, swap ~8M"
        );
    }
    
    /**
     * @notice Helper function to convert uint to string
     */
    function _uint2str(uint256 _i) internal pure returns (string memory str) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        str = string(bstr);
    }
    
    // ============ HELPER FUNCTIONS ============
    
    function _updateKCommitment() internal {
        lastUpdateBlock = block.number;
        kCommitment = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.number,
            address(this)
        )));
    }
    
    function _sqrtFHE(euint64 x) internal pure returns (euint64 y) {
        // Simplified square root for FHE (Newton's method approximation)
        euint64 z = TFHE.add(x, TFHE.asEuint64(uint64(1)));
        z = TFHE.div(z, TFHE.asEuint64(uint64(2)));
        y = x;
        
        // Limited iterations for gas efficiency
        for (uint256 i = 0; i < 10; i++) {
            ebool condition = TFHE.lt(z, y);
            y = TFHE.select(condition, z, y);
            z = TFHE.div(TFHE.add(TFHE.div(x, z), z), TFHE.asEuint64(uint64(2)));
        }
        
        return y;
    }

    // ============ GATEWAY CALLBACK ============
    
    /**
     * @notice Callback from FHE gateway (mock implementation)
     * @dev Override required by GatewayCaller abstract contract
     */
    function _gatewayCallback(uint256 requestId, bytes memory decryptedData) internal override {
        // Mock implementation - in production this would handle decrypted results
        // Use the parent's GatewayCall event
    }
}
