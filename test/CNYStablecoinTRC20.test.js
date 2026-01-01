const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CNYStablecoinTRC20", function () {
  let CNYStablecoinTRC20;
  let stablecoin;
  let admin;
  let user1;
  let user2;
  let oracleAddress;

  beforeEach(async function () {
    [admin, user1, user2, oracleAddress] = await ethers.getSigners();

    // Deploy stablecoin for Tron (TRC20)
    CNYStablecoinTRC20 = await ethers.getContractFactory("CNYStablecoinTRC20");
    stablecoin = await CNYStablecoinTRC20.deploy(admin.address, oracleAddress.address);
    await stablecoin.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await stablecoin.name()).to.equal("CNY Stablecoin");
      expect(await stablecoin.symbol()).to.equal("CNYS");
      expect(await stablecoin.decimals()).to.equal(18);
    });

    it("Should set the correct admin", async function () {
      expect(await stablecoin.admin()).to.equal(admin.address);
    });

    it("Should set the correct oracle", async function () {
      expect(await stablecoin.priceOracle()).to.equal(oracleAddress.address);
    });

    it("Should start with zero total supply", async function () {
      expect(await stablecoin.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow admin to mint tokens", async function () {
      const amount = ethers.utils.parseEther("1000");
      await expect(stablecoin.connect(admin).mint(user1.address, amount))
        .to.emit(stablecoin, "Minted")
        .withArgs(user1.address, amount, admin.address);

      expect(await stablecoin.balanceOf(user1.address)).to.equal(amount);
      expect(await stablecoin.totalSupply()).to.equal(amount);
    });

    it("Should not allow non-admin to mint tokens", async function () {
      const amount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(user1).mint(user2.address, amount)
      ).to.be.revertedWith("CNYStablecoinTRC20: caller is not admin");
    });

    it("Should not allow minting to zero address", async function () {
      const amount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(admin).mint(ethers.constants.AddressZero, amount)
      ).to.be.revertedWith("CNYStablecoinTRC20: mint to zero address");
    });

    it("Should not allow minting to blacklisted address", async function () {
      await stablecoin.connect(admin).blacklist(user1.address);
      const amount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(admin).mint(user1.address, amount)
      ).to.be.revertedWith("CNYStablecoinTRC20: cannot mint to blacklisted address");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      const amount = ethers.utils.parseEther("1000");
      await stablecoin.connect(admin).mint(user1.address, amount);
    });

    it("Should allow admin to burn tokens", async function () {
      const burnAmount = ethers.utils.parseEther("500");
      await expect(stablecoin.connect(admin).burn(user1.address, burnAmount))
        .to.emit(stablecoin, "Burned")
        .withArgs(user1.address, burnAmount, admin.address);

      expect(await stablecoin.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("500")
      );
    });

    it("Should not allow non-admin to burn tokens", async function () {
      const burnAmount = ethers.utils.parseEther("500");
      await expect(
        stablecoin.connect(user1).burn(user1.address, burnAmount)
      ).to.be.revertedWith("CNYStablecoinTRC20: caller is not admin");
    });
  });

  describe("Pause/Unpause", function () {
    beforeEach(async function () {
      const amount = ethers.utils.parseEther("1000");
      await stablecoin.connect(admin).mint(user1.address, amount);
    });

    it("Should allow admin to pause", async function () {
      await expect(stablecoin.connect(admin).pause())
        .to.emit(stablecoin, "Paused")
        .withArgs(admin.address);

      expect(await stablecoin.paused()).to.equal(true);
    });

    it("Should not allow transfers when paused", async function () {
      await stablecoin.connect(admin).pause();
      const amount = ethers.utils.parseEther("100");
      await expect(
        stablecoin.connect(user1).transfer(user2.address, amount)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow admin to unpause", async function () {
      await stablecoin.connect(admin).pause();
      await expect(stablecoin.connect(admin).unpause())
        .to.emit(stablecoin, "Unpaused")
        .withArgs(admin.address);

      expect(await stablecoin.paused()).to.equal(false);
    });
  });

  describe("Blacklist", function () {
    beforeEach(async function () {
      const amount = ethers.utils.parseEther("1000");
      await stablecoin.connect(admin).mint(user1.address, amount);
    });

    it("Should allow admin to blacklist address", async function () {
      await expect(stablecoin.connect(admin).blacklist(user1.address))
        .to.emit(stablecoin, "Blacklisted")
        .withArgs(user1.address, admin.address);

      expect(await stablecoin.blacklisted(user1.address)).to.equal(true);
    });

    it("Should not allow blacklisted address to transfer", async function () {
      await stablecoin.connect(admin).blacklist(user1.address);
      const amount = ethers.utils.parseEther("100");
      await expect(
        stablecoin.connect(user1).transfer(user2.address, amount)
      ).to.be.revertedWith("CNYStablecoinTRC20: account is blacklisted");
    });

    it("Should allow admin to unblacklist address", async function () {
      await stablecoin.connect(admin).blacklist(user1.address);
      await expect(stablecoin.connect(admin).unblacklist(user1.address))
        .to.emit(stablecoin, "Unblacklisted")
        .withArgs(user1.address, admin.address);

      expect(await stablecoin.blacklisted(user1.address)).to.equal(false);
    });
  });

  describe("Admin Management", function () {
    it("Should allow admin to update admin address", async function () {
      await expect(stablecoin.connect(admin).updateAdmin(user1.address))
        .to.emit(stablecoin, "AdminUpdated")
        .withArgs(admin.address, user1.address);

      expect(await stablecoin.admin()).to.equal(user1.address);
    });

    it("Should not allow non-admin to update admin", async function () {
      await expect(
        stablecoin.connect(user1).updateAdmin(user2.address)
      ).to.be.revertedWith("CNYStablecoinTRC20: caller is not admin");
    });
  });

  describe("Oracle Management", function () {
    it("Should allow admin to update oracle address", async function () {
      const newOracle = user1.address;
      await expect(stablecoin.connect(admin).updateOracle(newOracle))
        .to.emit(stablecoin, "OracleUpdated")
        .withArgs(oracleAddress.address, newOracle);

      expect(await stablecoin.priceOracle()).to.equal(newOracle);
    });

    it("Should get price oracle address", async function () {
      expect(await stablecoin.getPriceOracle()).to.equal(oracleAddress.address);
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      const amount = ethers.utils.parseEther("1000");
      await stablecoin.connect(admin).mint(user1.address, amount);
    });

    it("Should allow normal transfers", async function () {
      const amount = ethers.utils.parseEther("100");
      await expect(stablecoin.connect(user1).transfer(user2.address, amount))
        .to.emit(stablecoin, "Transfer")
        .withArgs(user1.address, user2.address, amount);

      expect(await stablecoin.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should allow approve and transferFrom", async function () {
      const amount = ethers.utils.parseEther("100");
      await stablecoin.connect(user1).approve(user2.address, amount);
      expect(await stablecoin.allowance(user1.address, user2.address)).to.equal(amount);

      await stablecoin.connect(user2).transferFrom(user1.address, user2.address, amount);
      expect(await stablecoin.balanceOf(user2.address)).to.equal(amount);
    });
  });
});
