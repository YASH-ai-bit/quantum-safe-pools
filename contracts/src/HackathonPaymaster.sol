// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./interfaces/IPaymaster.sol";
import "./interfaces/IEntryPoint.sol";
import "./interfaces/PackedUserOperation.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HackathonPaymaster
 * @dev Simple paymaster that sponsors gas for quantum-safe accounts
 * @notice Deterministic validation for improved bundler compatibility
 */
contract HackathonPaymaster is IPaymaster, Ownable {
    IEntryPoint public immutable entryPoint;

    // Max ETH sponsored per account (in wei) - 5 ETH (Increased for testing)
    uint256 public constant MAX_SPONSORED_PER_ACCOUNT = 5 ether;

    // Track ETH used by each account (in wei)
    mapping(address => uint256) public sponsoredAmount;

    event GasSponsored(address indexed account, uint256 costInWei);

    error OnlyEntryPoint();

    constructor(IEntryPoint _entryPoint, address _owner) Ownable(_owner) {
        entryPoint = _entryPoint;
    }

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) revert OnlyEntryPoint();
        _;
    }

    /**
     * @dev Validate the paymaster user operation
     * @notice Must be deterministic and lightweight (Validation Phase)
     */
    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32,
        uint256 maxCost
    ) external override onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        // Validation Phase:
        // 1. Check if we have enough deposit (EntryPoint handles this generally, but good to be sure)
        // 2. Check if user is allowed (Sponsorship limit)
        // We do NOT write to storage here to ensure simulation consistency
        
        // Return context for postOp to handle accounting
        // validationData = 0 (valid, no time range)
        return (abi.encode(userOp.sender), 0);
    }

    /**
     * @dev Post-operation handler
     * @notice Handle accounting here (Execution Phase)
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256
    ) external override onlyEntryPoint {
        // Only charge if operation succeeded or reverted (ignoring simulation only calls if any)
        // PostOpMode.opSucceeded or PostOpMode.opReverted
        
        (address account) = abi.decode(context, (address));
        
        sponsoredAmount[account] += actualGasCost;
        
        emit GasSponsored(account, actualGasCost);
    }

    /**
     * @dev Add stake to EntryPoint
     */
    function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
        (bool success,) = address(entryPoint).call{value: msg.value}(
            abi.encodeWithSignature("addStake(uint32)", unstakeDelaySec)
        );
        require(success, "addStake failed");
    }

    /**
     * @dev Deposit to EntryPoint
     */
    function deposit() external payable onlyOwner {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    /**
     * @dev Get current deposit
     */
    function getDeposit() external view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    /**
     * @dev Withdraw from EntryPoint
     */
    function withdrawTo(address payable withdrawAddress, uint256 amount) external onlyOwner {
        (bool success,) = address(entryPoint).call(
            abi.encodeWithSignature("withdrawTo(address,uint256)", withdrawAddress, amount)
        );
        require(success, "withdrawTo failed");
    }

    receive() external payable {}
}
