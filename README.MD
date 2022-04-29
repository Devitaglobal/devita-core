# DEVITA Global

This repository contains the core smart contracts required for the operation of DEVITA Global. The repository uses Hardhat as development environment for compilation, testing and deployment tasks.

## What is DEVITA?

DEVITA is a decentralized protocol that allows users access to Telehealth care services. Coupled with the decentralized health database enables wider-reaching access to healthcare and data management services to both urban and rural communities that would otherwise be unable to access health services. All that’s required is a device with internet connectivity.

We also provide data sovereignty to the user, as all the health based data is only accessible by the user themselves, unless they explicit grant permission to another party, such as medical professionals, etc.

Before getting started with this repo, please read the The [DEVITA Whitepaper](https://drive.google.com/file/d/1YZrXPVj9nMX8IFTprXY7Q74kOAhWrXH3/view), describing how DEVITA works.

## Connect with the Community
You can join at the [Telegram channel](https://t.me/DEVITAGlobal) for asking questions about the protocol or talk about DEVITA with other peers.

## Contracts

We detail a few of the core contracts used by DEVITA.

<dl>
  <dt>LIFE</dt>
  <dd>The DEVITA Utility and Governance Token (LIFE). This is the primary token used for the protocol and on the DEVITA platform. Holders of this token also have the ability to govern the protocol via the governor contract.</dd>
</dl>

<dl>
  <dt>Governor Alpha</dt>
  <dd>The administrator of the DEVITA timelock contract and governance controlled Escrows. Holders of DEVITA token may create, approve and vote on proposals which will be queued into the Timelock and then be executed. This contract may be replaced in the future with a version which allows for voting across multiple chains. </dd>
</dl>

<dl>
  <dt>LIFERewards</dt>
  <dd>The non-custodial perpetual liquidity staking pool for DEVITA. Users would be able to stake their Liquidity Pool tokens and be rewarded with LIFE tokens. Unlike traditional staking pools, this does not have a fixed duration period, the pool is constantly injected with tokens generated from other functions of the protocol.</dd>
</dl>

<dl>
  <dt>Vesting</dt>
  <dd>The Vesting contracts are used for storage and timely distribution of the LIFE tokens. Only a small portion of the total supply is initially released at launch, most of the tokens are locked for a duration of 6 to 24 months, depending on the allocation. This contract helps ensure the smoothened monthly distrubtion for the above.</dd>
</dl>

<dl>
  <dt>Escrow</dt>
  <dd>The Escrow contract is used to securely store LIFE tokens which are controlled by Governance. These Escrows are separated by the various purposes they fulfill such as Marketing, Settlement Reserve, Governance Fund etc. </dd>
</dl>

## Installation

To run DEVITA, pull the repository from GitHub and install its dependencies.

    git clone https://github.com/Devitaglobal/devita-core.git
    cd devita-core
    npm install
