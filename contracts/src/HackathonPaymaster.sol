// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./interfaces/IPaymaster.sol";
import "./interfaces/IEntryPoint.sol";
import "./interfaces/PackedUserOperation.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HackathonPaymaster
 * @dev Simple paymaster that sponsors gas for quantum-safe accounts
 * @notice For hackathon/testnet use - sponsors up to 50M gas per account
 */
contract HackathonPaymaster is IPaymaster, Ownable {
    IEntryPoint public immutable entryPoint;

    // Max gas sponsored per account
    uint256 public constant MAX_GAS_PER_ACCOUNT = 50_000_000;

    // Track gas used by each account
    mapping(address => uint256) public sponsoredGas;

    event GasSponsored(address indexed account, uint256 gasAmount);

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
     */
    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32,
        uint256 maxCost
    ) external override onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        address account = userOp.sender;

        // Check if account hasn't exceeded gas limit
        require(
            sponsoredGas[account] + maxCost <= MAX_GAS_PER_ACCOUNT,
            "Gas limit exceeded"
        );

        // Track the gas
        sponsoredGas[account] += maxCost;

        emit GasSponsored(account, maxCost);

        return ("", 0); // Valid
    }

    /**
     * @dev Post-operation handler (not used for now)
     */
    function postOp(
        PostOpMode,
        bytes calldata,
        uint256,
        uint256
    ) external override onlyEntryPoint {}

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
