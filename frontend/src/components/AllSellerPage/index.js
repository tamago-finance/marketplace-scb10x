import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import useOrder from "../../hooks/useOrder";
import { ChevronsLeft } from "react-feather";
import { shortAddress } from "../../helper";
import ReactPaginate from "react-paginate";

/* Styled Component */
const Container = styled.div.attrs(() => ({ className: "container" }))`
  margin-top: 2rem;
  display: flex;
  max-width: 900px;

  min-height: 250px;

  div {
    flex: 1;
    text-align: left;
  }

  h4 {
    text-align: center;
    margin-bottom: 20px;
  }
`;

const RankTable = styled(Table)`
  color: #fff;
`;

const TH = styled.th.attrs(() => ({ width: "15%" }))``;

const TR = styled.tr.attrs(() => ({}))`
  td {
    a {
      color: inherit;
      text-decoration: none;
    }
    :last-child {
      text-align: right;
    }
  }
`;

const LIMIT_PER_PAGE = 10;

const AllSellerPage = () => {
  const [sellers, setSellers] = useState([]);
  const { getTopSellersByIndex, getSellersTotal } = useOrder();
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    getTopSellersByIndex(0, LIMIT_PER_PAGE).then(setSellers);
    getSellersTotal().then(
      (totalCount) => {
        setPageCount(Math.ceil(totalCount / LIMIT_PER_PAGE));
      }
    );

  }, []);

  const handlePageClick = async (data) => {
    let currentPage = data.selected;
    getTopSellersByIndex(
      parseInt(currentPage) * LIMIT_PER_PAGE,
      LIMIT_PER_PAGE
    ).then(setSellers);
  };

  return (
    <Container>
      <div>
        <h4>All Sellers</h4>
        <RankTable>
          <tbody>
            {sellers.map((item, index) => {
              return (
                <TR key={`seller-${index}`}>
                  <TH>#{item.queryIndex}</TH>
                  <td>
                    <Link to={`/orders/owner/${item.address}`}>
                      {item.name
                        ? `@${item.name}`
                        : shortAddress(item.address, 10, -6)}
                    </Link>
                  </td>
                  <td>
                    {item.activeSellCount}
                    {` `}Items
                  </td>
                </TR>
              );
            })}
          </tbody>
        </RankTable>
        {/* <Link to={`/`} style={{ color: "#ffff" }}>
          <ChevronsLeft />
          back
        </Link> */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            textAlign: "center",
            marginTop: "2rem"
          }}
        >
          <ReactPaginate
            previousLabel={"<<"}
            nextLabel={">>"}
            breakLabel={"..."}
            pageCount={pageCount}
            marginPagesDisplayed={2}
            pageRangeDisplayed={3}
            onPageChange={handlePageClick}
            containerClassName={"pagination justify-content-center"}
            pageClassName={"page-item"}
            pageLinkClassName={"page-link"}
            previousClassName={"page-item"}
            previousLinkClassName={"page-link"}
            nextClassName={"page-item"}
            nextLinkClassName={"page-link"}
            breakClassName={"page-item"}
            breakLinkClassName={"page-link"}
            activeClassName={"active"}
          />
        </div>
      </div>
    </Container>
  );
};

export default AllSellerPage;
