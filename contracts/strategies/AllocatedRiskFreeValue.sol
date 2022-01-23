pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../Policy.sol";

contract AllocatedRiskFreeValue is ERC20, Policy {
    
    mapping(address => bool) minters;
    
    constructor() ERC20("Allocated RFV", "ARFV") {}
    
    function decimals() public view override returns (uint8) {
        return 9;
    }
    
    function mint(uint _amount) external onlyMinters {
        _mint(msg.sender, _amount);
    }
    
    function burn(uint _amount) external {
        _burn(msg.sender, _amount);
    }
    
    function addMinter(address _minter) external onlyPolicy {
        minters[_minter] = true;
    }
    
    function removeMinter(address _minter) external onlyPolicy {
        minters[_minter] = false;
    }
    
    function isMinter(address _minter) external view returns(bool) {
        return minters[_minter];
    }
    
    modifier onlyMinters(){
        require(minters[msg.sender] || _owner == msg.sender, "ARFV: caller is not minter");
        _;
    }
}
