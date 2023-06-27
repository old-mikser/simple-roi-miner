// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IERC20.sol";

contract Miner {
    address usdt = 0x55d398326f99059fF775485246999027B3197955;
    uint8 interest = 3;
    uint8 baseDevFee = 4;
    uint8 refBonus = 7;
    address owner;
    bool minerStarted;

    struct User {
        uint256 body;
        address refferer;
        uint256 availableBalance;
        uint256 investmentDate;
        uint256 lastWithdrawalDate;
    }

    mapping(address => User) users;

    constructor(address usdtExternal) {
        minerStarted = false;
        owner = msg.sender;
        usdt = usdtExternal;
    }

    function startMiner() public {
        require(msg.sender == owner, "You can't do this.");
        minerStarted = true;
    }

    function deposit(uint256 amount) public {
        deposit(amount, owner);
    }

    function deposit(uint256 amount, address refferer) public {
        uint256 baseAmount = amount;
        referrerBonus(refferer, amount);
        amount = devFee(amount, true);
        if(!createUser(msg.sender, amount, refferer, 0, block.timestamp, block.timestamp)){
            uint256 balance = checkBalance();
            if(balance > 0){
                _withdraw(balance);
            }
            users[msg.sender].lastWithdrawalDate = block.timestamp;
            users[msg.sender].body += amount;
        }
        (bool success, bytes memory data) = address(usdt).call(abi.encodeWithSelector(IERC20(usdt).transferFrom.selector, msg.sender, address(this), baseAmount));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'Insufficient balance, or wrong approvement.');
    }

    function withdraw() public {
        require(users[msg.sender].investmentDate != 0, "User doesnt exist");
        _withdraw(checkBalance());
    }

    function _withdraw(uint amount) private {
        require(amount > 0, "Nothing to withdraw...");
        users[msg.sender].availableBalance = 0;
        users[msg.sender].lastWithdrawalDate = block.timestamp;
        IERC20(usdt).transfer(msg.sender, devFee(amount, false));
    }

    function compound() public {
        uint256 balance = checkBalance();
        require( balance > 0, "Nothing to compound...");
        users[msg.sender].availableBalance = 0;
        users[msg.sender].body += balance;
        users[msg.sender].lastWithdrawalDate = block.timestamp;
    }

    function checkBalance() public view returns (uint256 balance) {
        if (users[msg.sender].investmentDate <= 1) {
            return users[msg.sender].availableBalance;
        } else {
            return users[msg.sender].availableBalance + (users[msg.sender].body * ((block.timestamp - users[msg.sender].lastWithdrawalDate) / 60 / 60 / 24) * interest / 100 ) ;
        }
    }

    function referrerBonus(address refferer, uint256 amount) private {
        uint256 bonus = (amount / 100) * refBonus;
        if(!createUser(refferer, 0, owner, bonus, 1, block.timestamp)){
            users[refferer].availableBalance += bonus;
        }
    }

    function createUser(address userAddress, uint256 body, address refferer, uint256 availableBalance, uint256 investmentDate, uint256 lastWithdrawalDate) private returns(bool) {
        if(users[userAddress].investmentDate != 0){
            return false;
        }else{
            users[userAddress] = User(body, refferer, availableBalance, investmentDate, lastWithdrawalDate);
        }
        return true;
     }

    function devFee(uint256 amount, bool incoming) private returns (uint256 afterFee) {
        //uint8 _devfee = incoming ? baseDevFee : baseDevFee / 2;
        users[owner].availableBalance += (amount / 100) * baseDevFee;
        return amount - ((amount / 100) * baseDevFee);
    }

    function getUser(address _address)public view
        returns (address user, uint256 body, address refferer, uint256 availableBalance, uint256 investmentDate, uint256 lastWithdrawalDate ){
        return (
            _address,
            users[_address].body,
            users[_address].refferer,
            users[_address].availableBalance,
            users[_address].investmentDate,
            users[_address].lastWithdrawalDate
        );
    }
}
