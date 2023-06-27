const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("Miner + USDT", function () {
  async function testSetup() {
    const [USDTOwner, MinerAdmin, MinerUser] = await ethers.getSigners();
    const _USDT = await ethers.getContractFactory("USDT");
    const _Miner = await ethers.getContractFactory("Miner");

    const USDT = await _USDT.connect(USDTOwner).deploy();
    const Miner = await _Miner.connect(MinerAdmin).deploy(USDT.getAddress());

    // Fixtures can return anything you consider useful for your tests
    return { USDT, Miner, USDTOwner, MinerAdmin, MinerUser };
  }

  it("Deposit Flow", async function () {
    const { USDT, Miner, USDTOwner, MinerAdmin, MinerUser } = await testSetup();
    await deposit(USDT, Miner, USDTOwner, MinerAdmin, MinerUser, 100000000000000000000n);
    //console.log("Contract balance: " + await USDT.connect(MinerUser).balanceOf(Miner.getAddress()) + " | User balance: " + await USDT.connect(MinerUser).balanceOf(MinerUser));
    
    // console.log(await Miner.getUser(MinerAdmin))
    // console.log(await Miner.getUser(MinerUser))
    //console.log(await Miner.connect(MinerUser).checkBalance());
    expect(await Miner.getUser(MinerUser)).to.include.any.members([96000000000000000000n, '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 0n]);
    expect(await Miner.getUser(MinerAdmin)).to.include.any.members([11000000000000000000n]);
    expect(await USDT.balanceOf(Miner.getAddress())).equal(100000000000000000000n);
    

  });

  async function deposit(USDT, Miner, USDTOwner, MinerAdmin, MinerUser, amount) {
    await USDT.connect(USDTOwner).transfer(MinerUser, amount);
    await USDT.connect(MinerUser).approve(Miner.getAddress(), amount);
    await Miner.connect(MinerUser).deposit(amount);
    await expect(Miner.connect(MinerUser).deposit(amount*2n)).to.be.revertedWith(`Insufficient balance, or wrong approvement.`);
  }

  it("Withdrawal Flow", async function () {
    const { USDT, Miner, USDTOwner, MinerAdmin, MinerUser } = await testSetup();
    await deposit(USDT, Miner, USDTOwner, MinerAdmin, MinerUser, 100000000000000000000n);
    await time.increase(3600 * 24 * 10);
    await Miner.connect(MinerUser).withdraw();
    expect(await USDT.connect(MinerAdmin).balanceOf(Miner.getAddress())).equal(72352000000000000000n); //contract has right money after withdrawal
    expect(await Miner.connect(MinerAdmin).checkBalance()).equal(12152000000000000000n);               // admin has right balance
    expect(await USDT.connect(MinerUser).balanceOf(MinerUser)).equal(27648000000000000000n);           //user got his money on wallet balance
    expect(await Miner.connect(MinerUser).checkBalance()).equal(0n);                                   //user's miner available balance is 0
    await time.increase(3600 * 24 * 10);
    await Miner.connect(MinerUser).withdraw();
    await expect(Miner.connect(MinerUser).withdraw()).to.be.revertedWith(`Nothing to withdraw...`);
    expect(await USDT.connect(MinerAdmin).balanceOf(Miner.getAddress())).equal(44704000000000000000n); //contract has right money after second withdrawal
    expect(await Miner.connect(MinerAdmin).checkBalance()).equal(13304000000000000000n);               //admin has right balance after second withdrawal

  });

  it("Second Deposit Flow", async function () {
    const { USDT, Miner, USDTOwner, MinerAdmin, MinerUser } = await testSetup();
    await deposit(USDT, Miner, USDTOwner, MinerAdmin, MinerUser, 100000000000000000000n);
    await time.increase(3600 * 24 * 10);
    await Miner.connect(MinerUser).withdraw();
    await time.increase(3600 * 24 * 10);
    await deposit(USDT, Miner, USDTOwner, MinerAdmin, MinerUser, 100000000000000000000n);
    expect(await Miner.connect(MinerAdmin).checkBalance()).equal(24304000000000000000n);               //admin has right balance after second withdrawal + second deposit
    await time.increase(3600 * 24 * 10);
    expect(await Miner.connect(MinerUser).checkBalance()).equal(57600000000000000000n);                //User has right balance after some time he updated his body
  });

  it("Compound", async function (){
    const { USDT, Miner, USDTOwner, MinerAdmin, MinerUser } = await testSetup();
    await deposit(USDT, Miner, USDTOwner, MinerAdmin, MinerUser, 100000000000000000000n);
    await time.increase(3600 * 24 * 10);
    await Miner.connect(MinerUser).withdraw();
    expect(await USDT.connect(MinerAdmin).balanceOf(Miner.getAddress())).equal(72352000000000000000n); 
    await expect(Miner.connect(MinerUser).compound()).to.be.revertedWith(`Nothing to compound...`);
    await time.increase(3600 * 24 * 10);
    await Miner.connect(MinerUser).compound();
    await time.increase(3600 * 24 * 10);
    expect(await Miner.connect(MinerUser).checkBalance()).equal(37440000000000000000n);                //user has right balance after compound
    await Miner.connect(MinerUser).withdraw();
    expect(await USDT.connect(MinerAdmin).balanceOf(Miner.getAddress())).equal(36409600000000000000n); //contract has right balance after withdrawal
    await expect(Miner.connect(MinerUser).withdraw()).to.be.revertedWith("Nothing to withdraw...");
  });

});