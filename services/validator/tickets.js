const { ethers } = require("ethers")

const Moralis = require("moralis/node")

const { NFT_MARKETPLACE } = require("../constants")
const { MARKETPLACE_ABI } = require("../abi")

// generate claim tickets for buyers and sellers
class Tickets {

    CLAIMS = []

    constructor({
        logger,
        providers,
        messages,
        orders
    }) {

        this.logger = logger
        this.providers = providers

        this.messages = messages
        this.orders = orders

    }

    async update() {
        this.CLAIMS = []

        this.logger.debug("Generate claim tickets for buyers...")

        await this.generateBuyerTickets()

        this.logger.debug("Generate claim tickets for sellers...")

        await this.generateSellerTickets()

    }

    async generateSellerTickets() {

        let claims = []

        for (let chainId of [42, 97, 80001, 43113]) {

            await Moralis.start(this.generateMoralisParams(chainId));

            // checking claim events
            const Claims = Moralis.Object.extend(this.resolveClaimTable(chainId));
            const query = new Moralis.Query(Claims);

            query.equalTo("isOriginChain", true)

            const results = await query.find();

            // looking for unclaimed orders
            for (let object of results) {

                const orderId = object.get("orderId")
                const fromAddress = object.get("fromAddress")

                const originalItem = this.orders.find(item => Number(item.orderId) === Number(orderId))

                if (originalItem && originalItem.barterList.length > 0) {

                    const list = originalItem.barterList.sort(function (a, b) {
                        return b.chainId - a.chainId;
                    });

                    for (let pairItem of list) {

                        const row = this.providers.find(item => Number(item.chainId) === Number(pairItem.chainId))

                        this.logger.debug("[Seller] Checking order : ", orderId)

                        if (row && row.provider) {

                            const { provider } = row
                            const { marketplaceAddress } = NFT_MARKETPLACE.find(item => Number(item.chainId) === Number(pairItem.chainId))

                            const marketplaceContract = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, provider)
                            try {
                                const result = await marketplaceContract.partialOrders(orderId)

                                if ( !result["ended"] && (result['buyer']).toLowerCase() === fromAddress.toLowerCase()) {
                                    // granting a ticket for the seller
                                    claims.push({
                                        orderId: orderId,
                                        chainId: pairItem.chainId,
                                        claimerAddress: originalItem.ownerAddress,
                                        isOrigin: false
                                    })
                                    break
                                }

                            } catch (e) {
                                // console.log("no active oriders on chain id : ", pairItem.chainId)
                            }
                        }
                    }
                }
            }
        }

        this.logger.debug("Total seller claims : ", claims.length)

        this.CLAIMS = this.CLAIMS.concat(claims)

    }

    async generateBuyerTickets() {

        let checks = []
        let claims = []

        // find the claim result
        for (let message of this.messages) {

            const { ownerAddress, chainId, orderId } = this.orders.find(item => item.orderId === message.orderId)

            // to prevent unnesssary checks
            const check = checks.find(item => item.orderId === orderId && item.chainId === message.chainId)

            if (!check) {
                checks.push({
                    chainId: message.chainId,
                    orderId
                })

                this.logger.debug("[Buyer] Checking order : ", orderId)

                // check pair chain first
                const row = this.providers.find(item => item.chainId === message.chainId)

                if (row && row.provider) {

                    const { provider } = row
                    const { marketplaceAddress } = NFT_MARKETPLACE.find(item => item.chainId === message.chainId)

                    const marketplaceContract = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, provider)
                    const result = await marketplaceContract.partialOrders(orderId)

                    if (result['active']) {
                        // Buyer
                        claims.push({
                            orderId: message.orderId,
                            chainId,
                            claimerAddress: result['buyer'],
                            isOrigin: true
                        })
                    }
                }
            }
        }

        // remove duplicates
        claims = claims.reduce((output, item) => {
            const existing = output.find(x => x.hash === (ethers.utils.hashMessage(JSON.stringify(item))))
            if (!existing) {
                output.push({
                    ...item,
                    hash: ethers.utils.hashMessage(JSON.stringify(item))
                })
            }
            return output
        }, [])

        this.logger.debug("Total buyer claims : ", claims.length)

        this.CLAIMS = this.CLAIMS.concat(claims)
    }

    generateMoralisParams(chainId) {
        if ([42, 80001, 97, 43113].indexOf(chainId) !== -1) {
            return {
                serverUrl: "https://1ovp3qunsgo4.usemoralis.com:2053/server",
                appId: "enCW1fXy8eMazgGNIgwKdOicHVw67k0AegYAr2eE",
                masterKey: "AdNlpYjZuuiCGzlPaonWrJoGSIB6Scnae2AiNY6B"
            }
        }
        throw new Error("Chain isn't supported")
    }

    resolveClaimTable(chainId) {
        switch (chainId) {
            case 97:
                return "bnbTestnetClaim"
            case 42:
                return "kovanTestnetClaim"
            case 80001:
                return "mumbaiTestnetClaim"
            case 43113:
                return "fujiTestnetClaim"
        }
    }

    getClaims() {
        return this.CLAIMS
    }

}

module.exports = {
    Tickets
}