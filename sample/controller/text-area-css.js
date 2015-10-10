
import css from "../../dist/util/css";

css(`

  .sample-text-area{
    width: 100%;
    display: table;
    table-layout: fixed;
    border-top: 1px solid #999;
    border-bottom: 1px solid #999;
  }
  .sample-text-area > div{
    display: table-cell;
  }
  .sample-text-area-id{
    width: 100px;
    background: #bbb;
    text-align: center;
  }
  .sample-text-area-box{
    width: 100%;
  }
  .sample-text-area-box > input{
    border: none;
    width: calc(100% - 10px);
    margin: 0px 5px;
  }
  .sample-text-area-box > input:focus{
    outline: none;
  }
`);