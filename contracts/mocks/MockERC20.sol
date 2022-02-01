pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    
    uint8 dec;
    
    constructor(uint8 _decimals) ERC20("Mock Token", "TTT") {
        dec = _decimals;
    }

    function decimals() public view virtual override returns (uint8) {
        return dec;
    }
    
    function mint(address _account, uint _amount) external {
        _mint(_account, _amount);
    }
    
    function burn(address _account, uint _amount) external {
        _burn(_account, _amount);
    }
}
