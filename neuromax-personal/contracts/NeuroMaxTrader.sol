// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal interfaces — avoids external imports so the contract compiles
/// standalone with solc. In production you may import OpenZeppelin equivalents.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Uniswap V3 SwapRouter (exact-input single) — deployed on Base.
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

/// @title NeuroMaxTrader
/// @notice Personal trade-execution contract for the NeuroMax platform on Base.
///         Only the owner can execute swaps; every swap enforces a caller-supplied
///         minimum output (slippage protection) and a deadline. Includes a pause
///         switch and emergency withdrawal so funds are never trapped.
contract NeuroMaxTrader {
    address public owner;
    bool public paused;
    ISwapRouter public immutable router;
    uint24 public defaultPoolFee = 3000; // 0.3% Uniswap V3 tier

    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event PausedSet(bool paused);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    error NotOwner();
    error IsPaused();
    error DeadlinePassed();
    error ZeroAddress();
    error SwapFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert IsPaused();
        _;
    }

    constructor(address _router) {
        if (_router == address(0)) revert ZeroAddress();
        owner = msg.sender;
        router = ISwapRouter(_router);
    }

    /// @notice Execute a single-hop exact-input swap with slippage + deadline guards.
    /// @param tokenIn       token being sold (must be held by this contract)
    /// @param tokenOut      token being bought
    /// @param amountIn      exact input amount
    /// @param minAmountOut  minimum acceptable output (slippage protection)
    /// @param deadline      unix timestamp after which the tx reverts
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external onlyOwner whenNotPaused returns (uint256 amountOut) {
        if (tokenIn == address(0) || tokenOut == address(0)) revert ZeroAddress();
        if (block.timestamp > deadline) revert DeadlinePassed();

        // Approve exactly amountIn to the router (reset to 0 first for safety).
        IERC20(tokenIn).approve(address(router), 0);
        IERC20(tokenIn).approve(address(router), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: defaultPoolFee,
            recipient: owner, // proceeds go straight to the owner wallet
            amountIn: amountIn,
            amountOutMinimum: minAmountOut, // enforced on-chain by the router
            sqrtPriceLimitX96: 0
        });

        amountOut = router.exactInputSingle(params);
        if (amountOut < minAmountOut) revert SwapFailed();

        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut);
    }

    /// @notice Fund the contract by transferring tokens in beforehand, or pull
    ///         from the owner here (owner must have approved this contract).
    function depositFrom(address token, uint256 amount) external onlyOwner {
        if (!IERC20(token).transferFrom(msg.sender, address(this), amount)) revert SwapFailed();
    }

    function setPoolFee(uint24 fee) external onlyOwner {
        defaultPoolFee = fee;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedSet(_paused);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Emergency: pull any ERC20 (or ETH) out of the contract to the owner.
    function withdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool ok, ) = owner.call{value: amount}("");
            if (!ok) revert SwapFailed();
        } else {
            if (!IERC20(token).transfer(owner, amount)) revert SwapFailed();
        }
        emit Withdrawn(token, owner, amount);
    }

    receive() external payable {}
}
