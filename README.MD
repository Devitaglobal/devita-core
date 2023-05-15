# DEVITA Global

This repository contains the core smart contracts required for the operation of DEVITA Global. The repository uses Hardhat as development environment for compilation, testing and deployment tasks.

## What is DEVITA?

DEVITA is a multifaceted blockchain protocol designed to decentralize and transform data management and ownership across multiple industry verticals. Our mission is to pioneer a self-sovereign data world where users have complete control over their information.

Initially launched to address the crucial needs and unique challenges of the healthcare sector, DEVITA has successfully implemented a decentralized telehealth care service coupled with a robust health database. This solution offers unprecedented access to healthcare and data management services to communities worldwide, regardless of their location or infrastructure. The only requirement is a device with an internet connection.

In our healthcare vertical, we emphasize user data sovereignty. All health-related data is exclusively accessible by the user unless they explicitly grant permission to another party, such as medical professionals.

Recently, DEVITA has expanded its focus to the pet care industry, demonstrating our commitment to adaptability and cross-industry transformation. This venture is just one of many as we strive to enhance user experience, privacy, and access to services in a multitude of sectors.

Regardless of the industry vertical, our philosophy remains consistent: we empower users with control over their data, while leveraging the blockchain's potential to broaden access to essential services. Our aim is to catalyze positive change and innovation across all sectors we touch.

Before getting started with this repo, please read the The [DEVITA Whitepaper](https://drive.google.com/file/d/1YZrXPVj9nMX8IFTprXY7Q74kOAhWrXH3/view), describing how DEVITA works.

## Connect with the Community
You can join our [Telegram channel](https://t.me/DEVITAGlobal) for asking questions about the protocol or talk about DEVITA with other peers.

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
