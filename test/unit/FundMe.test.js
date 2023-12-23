const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async () => {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.parseEther("0.2");
      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      describe("constructor", async () => {
        it("sets the aggregator addresses correctly", async () => {
          const response = await fundMe.s_priceFeed();
          assert.equal(response, mockV3Aggregator.target);
        });
      });

      describe("fund", async () => {
        it("fails if you dont send enough ETH", async () => {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });
        it("update the amount funded data structure", async () => {
          await fundMe.fund({ value: sendValue });
          const Response = await fundMe.getAddressToAmountFunded(deployer);
          assert.equal(Response.toString(), sendValue.toString());
        });
        it("Adds funder to array of getFunder", async () => {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.getFunder(0);
          assert.equal(funder, deployer);
        });
      });
      describe("withdraw", async () => {
        beforeEach(async () => {
          await fundMe.fund({ value: sendValue });
        });
        it("withdraw ETH from a single funder", async () => {
          const startingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const { gasUsed, gasPrice } = transactionReceipt;

          const gasCost = gasUsed * gasPrice;

          const endingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance + startingDeployerBalance,
            endingDeployerBalance + gasCost
          );
        });
        it("allow us to withdraw with multiple funder", async () => {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const { gasUsed, gasPrice } = transactionReceipt;

          const gasCost = gasUsed * gasPrice;

          const endingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance + startingDeployerBalance,
            endingDeployerBalance + gasCost
          );

          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
        it("only allows owner to withdraw", async () => {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];

          const attackerConnectedContract = await fundMe.connect(attacker);

          await expect(attackerConnectedContract.cheaperWithdraw()).to.be
            .reverted;
        });
        it("cheaperWithdraw test", async () => {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const { gasUsed, gasPrice } = transactionReceipt;

          const gasCost = gasUsed * gasPrice;

          const endingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance + startingDeployerBalance,
            endingDeployerBalance + gasCost
          );

          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
      });
    });
