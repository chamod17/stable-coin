const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CNYStablecoin", function () {
  let CNYStablecoin;
  let stablecoin;
  let admin;
  let user1;
  let user2;
  let mockOracle;

  beforeEach(async function () {
    [admin, user1, user2] = await ethers.getSigners();

    // Deploy mock oracle
    const MockOracle = await ethers.getContractFactory("MockChainlinkOracle");
    mockOracle = await MockOracle.deploy();
    await mockOracle.deployed();

    // Set initial price (e.g., 0.14 USD per CNY, with 8 decimals)
    await mockOracle.setLatestAnswer(14000000); // 0.14 * 10^8

    // Deploy stablecoin
    CNYStablecoin = await ethers.getContractFactory("CNYStablecoin");
    stablecoin = await CNYStablecoin.deploy(admin.address, mockOracle.address);
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
      expect(await stablecoin.priceOracle()).to.equal(mockOracle.address);
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
      ).to.be.revertedWith("CNYStablecoin: caller is not admin");
    });

    it("Should not allow minting to zero address", async function () {
      const amount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(admin).mint(ethers.constants.AddressZero, amount)
      ).to.be.revertedWith("CNYStablecoin: mint to zero address");
    });

    it("Should not allow minting zero amount", async function () {
      await expect(
        stablecoin.connect(admin).mint(user1.address, 0)
      ).to.be.revertedWith("CNYStablecoin: mint amount must be greater than 0");
    });

    it("Should not allow minting to blacklisted address", async function () {
      await stablecoin.connect(admin).blacklist(user1.address);
      const amount = ethers.utils.parseEther("1000");
      await expect(
        stablecoin.connect(admin).mint(user1.address, amount)
      ).to.be.revertedWith("CNYStablecoin: cannot mint to blacklisted address");
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
      ).to.be.revertedWith("CNYStablecoin: caller is not admin");
    });

    it("Should not allow burning more than balance", async function () {
      const burnAmount = ethers.utils.parseEther("2000");
      await expect(
        stablecoin.connect(admin).burn(user1.address, burnAmount)
      ).to.be.revertedWith("CNYStablecoin: insufficient balance to burn");
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

    it("Should not allow non-admin to pause", async function () {
      await expect(
        stablecoin.connect(user1).pause()
      ).to.be.revertedWith("CNYStablecoin: caller is not admin");
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
      ).to.be.revertedWith("CNYStablecoin: account is blacklisted");
    });

    it("Should not allow transfers to blacklisted address", async function () {
      await stablecoin.connect(admin).blacklist(user2.address);
      const amount = ethers.utils.parseEther("100");
      await expect(
        stablecoin.connect(user1).transfer(user2.address, amount)
      ).to.be.revertedWith("CNYStablecoin: account is blacklisted");
    });

    it("Should allow admin to unblacklist address", async function () {
      await stablecoin.connect(admin).blacklist(user1.address);
      await expect(stablecoin.connect(admin).unblacklist(user1.address))
        .to.emit(stablecoin, "Unblacklisted")
        .withArgs(user1.address, admin.address);

      expect(await stablecoin.blacklisted(user1.address)).to.equal(false);
    });

    it("Should not allow non-admin to blacklist", async function () {
      await expect(
        stablecoin.connect(user1).blacklist(user2.address)
      ).to.be.revertedWith("CNYStablecoin: caller is not admin");
    });

    it("Should not allow blacklisting admin", async function () {
      await expect(
        stablecoin.connect(admin).blacklist(admin.address)
      ).to.be.revertedWith("CNYStablecoin: cannot blacklist admin");
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
      ).to.be.revertedWith("CNYStablecoin: caller is not admin");
    });

    it("Should not allow updating to zero address", async function () {
      await expect(
        stablecoin.connect(admin).updateAdmin(ethers.constants.AddressZero)
      ).to.be.revertedWith("CNYStablecoin: new admin is zero address");
    });
  });

  describe("Oracle Management", function () {
    it("Should allow admin to update oracle address", async function () {
      const newOracle = user1.address; // Just for testing
      await expect(stablecoin.connect(admin).updateOracle(newOracle))
        .to.emit(stablecoin, "OracleUpdated")
        .withArgs(mockOracle.address, newOracle);

      expect(await stablecoin.priceOracle()).to.equal(newOracle);
    });

    it("Should not allow non-admin to update oracle", async function () {
      await expect(
        stablecoin.connect(user1).updateOracle(user2.address)
      ).to.be.revertedWith("CNYStablecoin: caller is not admin");
    });
  });

  describe("Price Oracle", function () {
    it("Should get CNY price from oracle", async function () {
      const [price, timestamp] = await stablecoin.getCNYPrice();
      expect(price).to.equal(14000000); // 0.14 * 10^8
      expect(timestamp).to.be.gt(0);
    });

    it("Should reject stale price data", async function () {
      // Set old timestamp (more than 1 hour ago)
      await mockOracle.setUpdatedAt(Math.floor(Date.now() / 1000) - 7200);
      await expect(stablecoin.getCNYPrice()).to.be.revertedWith(
        "CNYStablecoin: price data too old"
      );
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
