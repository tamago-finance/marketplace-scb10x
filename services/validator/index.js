#!/usr/bin/env node

require("dotenv").config();
const retry = require("async-retry");
const logger = require('loglevel');
const { ethers } = require("ethers")
const { MerkleTree } = require('merkletreejs')
const keccak256 = require("keccak256")

logger.enableAll()

const { delay, getProviders, DUMMY , generateRelayMessages } = require("../helper")


async function run({
    pollingDelay,
    errorRetries,
    errorRetriesTimeout
}) {

    try {

        await retry(
            async () => {

                const chainIds = DUMMY.filter(item => item.confirmed).reduce((output, item) => {
                    const { chainId } = item
                    if (chainId && output.indexOf(chainId) === -1) {
                        output.push(chainId)
                    }
                    return output
                }, [])

                const providers = getProviders(chainIds)

                // get the original messages
                const messages = generateRelayMessages(DUMMY.filter(item => item.confirmed))

                let claims = []

                // find the claim result
                for (let message of messages) {

                    const { ownerAddress, chainId } = DUMMY.find( item => item.orderId === message.orderId)

                    // TODO : Check whether the order is partially fulfilled

                    if (true) {

                        // Buyer
                        claims.push({
                            orderId : message.orderId,
                            chainId,
                            claimerAddress : ethers.constants.AddressZero, // TODO : replace with buyer address
                            isOrigin : true
                        })

                        // Seller
                        claims.push({
                            orderId : message.orderId,
                            chainId : message.chainId,
                            claimerAddress : ownerAddress,
                            isOrigin : false
                        })

                    }
                }

                logger.debug("Total claims : ", claims.length)

                // Construct the merkle 
                const leaves = claims.map(({ orderId, chainId, claimerAddress, isOrigin }) => ethers.utils.keccak256(ethers.utils.solidityPack(["uint256", "uint256", "address", "bool"], [orderId, chainId, claimerAddress, isOrigin]))) // Order ID, Chain ID, Claimer Address, Is Origin Chain
                const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
                const hexRoot = tree.getHexRoot()

                logger.debug("Merkle root to push : ", hexRoot)
                
                // TODO : upload the hex root
                
            },
            {
                retries: errorRetries,
                minTimeout: errorRetriesTimeout * 1000, // delay between retries in ms
                randomize: false,
                onRetry: error => {
                    console.log(error)
                    logger.debug(error.message)
                }
            }
        );


        logger.debug("End of execution loop ", (new Date()).toLocaleTimeString())
        await delay(Number(pollingDelay));
    }
    catch (error) {
        // If any error is thrown, catch it and bubble up to the main try-catch for error processing in the Poll function.
        throw typeof error === "string" ? new Error(error) : error;
    }

}


async function Poll(callback) {
    try {

        console.log("Start of process", (new Date()).toLocaleTimeString())

        const executionParameters = {
            pollingDelay: Number(process.env.POLLING_DELAY) || 60, // 10 minutes
            queryDelay: Number(process.env.QUERY_DELAY) || 40,
            queryInterval: { 137: 40000, 1: 4000 },
            errorRetries: Number(process.env.ERROR_RETRIES) || 5,
            errorRetriesTimeout: Number(process.env.ERROR_RETRIES_TIMEOUT) || 10
        }

        await run({ ...executionParameters });

    } catch (error) {

        logger.error(error.message)

        callback(error)
    }
    callback()
}


function nodeCallback(err) {
    if (err) {
        console.error(err);
        process.exit(1);
    } else process.exit(0);
}


// If called directly by node, execute the Poll Function. This lets the script be run as a node process.
if (require.main === module) {
    Poll(nodeCallback)
        .then(() => { })
        .catch(nodeCallback);
}