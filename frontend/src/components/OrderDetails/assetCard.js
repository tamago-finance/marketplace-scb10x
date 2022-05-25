import React, { useEffect, useState, useCallback } from "react"
import styled from "styled-components"
import { resolveNetworkName } from "../../helper"
import useOrder from "../../hooks/useOrder"
import Skeleton from "react-loading-skeleton"
import { Puff } from "react-loading-icons"


const Container = styled.div`
  background-color: rgba(38, 38, 38, 0.6);
  width: 260px;
  min-height: 380px;
  border-radius: 12px;
  padding: 12px; 
  border: 1px solid transparent;
  margin-left: 3px;
  margin-right: 3px;
  margin-bottom: 10px;

  .name {
    color: #fff;
    margin-top: 12px;
  }
`

const AssetCard = ({ order, item, crossChain, id }) => {

    const { resolveMetadata } = useOrder()
    const [data, setData] = useState()
    const [loading, setLoading] = useState(false)

    const { swap } = useOrder()

    useEffect(() => {

        if (item && item.tokenType !== 0) {

            setTimeout(() => {

                resolveMetadata({
                    assetAddress: item.assetAddress,
                    tokenId: item.assetTokenIdOrAmount,
                    chainId: item.chainId
                }).then(setData)

            }, (id + 1) * 3000)

        }

        return () => {
            setData()
        }

    }, [item, id])

    const onSwap = useCallback(async (index) => {

        setLoading(true)

        try {
            const tx = await swap(order, index)
            await tx.wait()
        } catch (e) {
            console.log(e)
            alert(`${e.message}`)
        }

        setLoading(false)



    }, [order])

    return (
        <Container>
            {data ? <img src={data.metadata && data.metadata.image ? data.metadata.image : "https://via.placeholder.com/200x200"} width="100%" height="220" />
                : <Skeleton height="220px" />
            }
            <div className="name">
                {data ? `${data.metadata.name} #${item.assetTokenIdOrAmount} ` : <Skeleton height="16px" />}
            </div>
            <div className="name">Chain: {resolveNetworkName(item.chainId)}</div>

            {!crossChain &&
                <button
                    style={{
                        color: "white",
                        borderRadius: "32px",
                        marginTop: "12px",
                        width: "100%"
                    }}
                    className="btn btn-primary shadow"
                    onClick={() => onSwap(item.index)}
                    disabled={loading}
                >
                    {loading &&
                        <Puff height="24px" style={{ marginRight: "5px" }} width="24px" />}
                    Swap
                </button>

            }
            {crossChain &&
                <>
                    <button
                        style={{
                            color: "white",
                            borderRadius: "32px",
                            marginTop: "12px",
                            width: "100%"
                        }}
                        className="btn btn-primary shadow"
                        disabled={true}
                    >
                        Swap
                    </button>

                </>

            }
        </Container>
    )
}

export default AssetCard