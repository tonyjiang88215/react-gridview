import {Record, Map, Range, List}from "immutable";
import ColumnHeader from "./column-header";
import RowHeader from "./row-header";
import {CellPoint, BORDER_POSITION} from "../common";
import Cell from "./cell";
import Scroll from "./scroll";
import Border from "./border";
import {OBJECT_TYPE} from "./object-type";

const emptyCell = new Cell();
const emptyBorder = new Border();
export {
OBJECT_TYPE
};

// テーブルに参照ポイントの適用を行う
function refsApply(table, prevCell, nextCell) {
    // 参照セルの値を更新

    prevCell.refs.forEach((ref) => {
        if (table.has(ref)) {
            const cell = table.get(ref).deleteChildId(prevCell.toId());
            table = table.set(ref, cell);
        }
    });

    nextCell.refs.forEach((ref) => {
        if (table.has(ref)) {
            const cell = table.get(ref).addChildId(nextCell.toId());
            table = table.set(ref, cell);
        }
    });

    return table;

}

// JSONからテーブル情報を生成
function JsonToTable(json) {
    let table = Map();

    if (!json) {
        return table;
    }
    for (var key in json) {
        const cell = Cell.fromJS(json[key]);
        table = table.set(key, cell);
    }
    return table;
}

/**
 * 表示情報
 */
export default class Sheet extends Record({
    columnHeader: new ColumnHeader(),
    rowHeader: new RowHeader(),
    table: Map(),
    stickies: List(),
    borders: Map(),
    scroll: new Scroll(),
    zoom: 100,
    onChangeCell: (prevCell: Cell, nextCell: Cell) => {
        return nextCell;
    }
}) {

    columnHeader: ColumnHeader;
    rowHeader: RowHeader;
    table: any;
    stickies: any;
    borders: any;
    scroll: Scroll;
    zoom: number;
    onChangeCell: (prev: Cell, nextCell: Cell) => Cell;



    static create() {
        return new Sheet();
    }

    static createClass() {
        return new Sheet();
    }

    // JSONから本クラスを生成
    static fromJS(json) {
        const sheet = new Sheet();
        // テーブル情報を変換
        return sheet
            .setTable(JsonToTable(json.cells))
            .setColumnHeader(ColumnHeader.fromJS(json.columnHeader))
            .setRowHeader(RowHeader.fromJS(json.rowHeader));
    }

    toJS() {
        //const mapJS = (items) =>{
        let tableJS = {};
        this.table.forEach((item, key) => {
            const cell = item.toMinJS();
            if (Object.keys(cell).length) {
                tableJS[key] = cell;
            }
        });

        return {
            columnHeader: this.columnHeader.toMinJS(),
            rowHeader: this.rowHeader.toMinJS(),
            cells: tableJS,
            borders: this.borders.toJS()
        };
    }


    // 本クラスをJSONへ変換
    toFullJS() {
        return {
            columnHeader: this.columnHeader.toJS(),
            rowHeader: this.rowHeader.toJS()
        };
    }

    setTable(table): this {
        return <this>this.set("table", table);
    }

    setColumnHeader(columnHeader): this {
        return <this>this.set("columnHeader", columnHeader);
    }

    setRowHeader(rowHeader): this {
        return <this>this.set("rowHeader", rowHeader);
    }

    setZoom(zoom): this {
        return <this>this.set("zoom", zoom);
    }

    editRowHeader(mutator): this {
        return <this>this.set("rowHeader", mutator(this.rowHeader));
    }

    editColumnHeader(mutator): this {
        return <this>this.set("columnHeader", mutator(this.columnHeader));
    }


    getCell(arg): Cell {
        //
        // const id = (typeof target === "string") ? target : target.toId();
        // const cellPoint = (typeof target === "string") ? CellPoint.createForId(id) : target;


        let id;
        let cellPoint;
        if (arguments.length === 1) {
            id = (typeof arguments[0] === "string") ? arguments[0] : arguments[0].toId();
            cellPoint = (typeof arguments[0] === "string") ? CellPoint.createForId(id) : arguments[0];
        }
        else {
            cellPoint = new CellPoint(arguments[0], arguments[1]);
            id = cellPoint.toId();
        }

        if (this.table.has(id) === false) {
            return Cell.create(cellPoint);
        }

        return this.table.get(id);
    }


    setOnChangeCell(onChangeCell): this {
        return <this>this.set("onChangeCell", onChangeCell);
    }

    getValueForId(id) {
        if (this.table.has(id) === false) {
            return "";
        }
        return this.table.get(id).value;
    }

    // 値のセット
    setValue(cellPoint, value): this {
        const nextCell = this.getCell(cellPoint).setValue(value);
        return <this>this.setCell(cellPoint, nextCell);
    }

    setCell(arg, arg2) {
        const cellPoint = (arguments.length === 2) ? arguments[0] : new CellPoint(arguments[0], arguments[1]);
        let nextCell = arguments[arguments.length - 1];
        const prevCell = this.getCell(cellPoint);
        nextCell = nextCell.solveCalc(this);
        let cell = this.onChangeCell(prevCell, nextCell);
        if (cell === prevCell) {
            return this;
        }
        let table = emptyCell.equals(cell) ?
            this.table.delete(cellPoint.toId()) :
            this.table.set(cellPoint.toId(), cell);

        // 参照セルの値を更新
        table = refsApply(table, prevCell, cell);

        let sheet = this.setTable(table);
        if (cell.text !== prevCell.text) {
            cell.childIds.forEach(id=> {
                const childCell = sheet.table.get(id);
                sheet = sheet.setTable(sheet.table.set(id, childCell.solveCalc(sheet)));
            });
        }

        return sheet;
    }

    get defaultBorder() {
        return emptyBorder;
    }

    get scale() {
        // デバイスのピクセル比を取得する
        // var dpr = (window && window.devicePixelRatio) || 1;
        // return this.zoom / 100 * dpr || 1;
        return this.zoom / 100 || 1;
    }
    // 枠線取得
    getBorder(cellPoint, borderPosition) {
        const id = cellPoint.toId() + "-" + borderPosition;
        if (this.borders.has(id) === false) {
            return this.defaultBorder;
        }

        return this.borders.get(id);
    }

    // 枠線設定
    setBorder(cellPoint, borderPosition, border): this {
        if (!cellPoint) {
            return this;
        }

        if (borderPosition === BORDER_POSITION.RIGHT) {
            cellPoint = cellPoint.setColumnNo(cellPoint.columnNo + 1);
            borderPosition = BORDER_POSITION.LEFT;
        }

        if (borderPosition === BORDER_POSITION.BOTTOM) {
            cellPoint = cellPoint.setRowNo(cellPoint.rowNo + 1);
            borderPosition = BORDER_POSITION.TOP;
        }

        const id = cellPoint.toId() + "-" + borderPosition;
        if (!border) {
            if (this.borders.has(id)) {
                return <this>this.set("borders", this.borders.delete(id));
            }
            else {
                return this;
            }
        }

        const prevBorder = this.getBorder(cellPoint, borderPosition);
        if (prevBorder.equals(border)) {
            return this;
        }

        return <this>this.set("borders", this.borders.set(id, border));
    }

    editCell(cellPoint, mutator): this {
        const prevCell = this.getCell(cellPoint);
        const nextCell = mutator(prevCell);
        return this.setCell(cellPoint, nextCell);
    }

    // 範囲内のセルを変更する
    editCells(range, mutator) {
        if (!range) {
            return this;
        }
        const left = Math.min(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const right = Math.max(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const top = Math.min(range.cellPoint1.rowNo, range.cellPoint2.rowNo);
        const bottom = Math.max(range.cellPoint1.rowNo, range.cellPoint2.rowNo);

        let model = this;
        Range(left, right + 1).forEach((columnNo) => {
            Range(top, bottom + 1).forEach((rowNo) => {
                const cellPoint = new CellPoint(columnNo, rowNo);
                const prevCell = this.getCell(cellPoint);
                const nextCell = mutator(prevCell);
                model = model.setCell(cellPoint, nextCell);
                //model = model.setValue(new CellPoint(columnNo, rowNo), value);
            });
        });

        return model;
    }

    getCells(range) {
        if (!range) {
            return List();
        }
        const left = Math.min(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const right = Math.max(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const top = Math.min(range.cellPoint1.rowNo, range.cellPoint2.rowNo);
        const bottom = Math.max(range.cellPoint1.rowNo, range.cellPoint2.rowNo);

        let cells = List();

        Range(left, right + 1).forEach((columnNo) => {
            Range(top, bottom + 1).forEach((rowNo) => {
                const cellPoint = new CellPoint(columnNo, rowNo);
                cells = cells.push(this.getCell(cellPoint));
            });
        });

        return cells;
    }

    addSticky(sticky) {
        return this.set("stickies", this.stickies.push(sticky));
    }

    deleteSticky(index) {
        return this.set("stickies", this.stickies.delete(index));
    }

    // 範囲内のセルを取得する
    setValueRange(range, value): this {
        if (!range) {
            return this;
        }
        const left = Math.min(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const right = Math.max(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const top = Math.min(range.cellPoint1.rowNo, range.cellPoint2.rowNo);
        const bottom = Math.max(range.cellPoint1.rowNo, range.cellPoint2.rowNo);

        let model = this;
        Range(left, right + 1).forEach((columnNo) => {
            Range(top, bottom + 1).forEach((rowNo) => {
                model = model.setValue(new CellPoint(columnNo, rowNo), value);
            });
        });

        return model;

    }

    /**
     * 複数範囲の値を変更する
     * @param {List} ranges 範囲リスト
     * @param {string} value  変更値
     */
    setValueRanges(ranges, value): this {
        if (!ranges) {
            return this;
        }

        let model = this;

        ranges.forEach(range => {
            model = model.setValueRange(range, value);
        });
        return model;
    }


    // 絶対座標の列情報を探す(二分探索)
    pointToColumnNo(pointX, firstIndex?, lastIndex?) {

        if ((!firstIndex) && (lastIndex !== 0)) {
            firstIndex = 1;
        }

        if ((!lastIndex) && (lastIndex !== 0)) {
            lastIndex = this.columnHeader.maxCount;
        }

        // 上限下限が逆転してしまったら、範囲外にはもう無い
        if (firstIndex > lastIndex) {
            return 0;
        }

        // 一区画あたりのセル数（切り上げ）
        const targetIndex = Math.ceil((firstIndex + lastIndex) / 2);
        const cellPoint = this.columnHeader.items.get(targetIndex);

        // ターゲットがもっと左側にある
        if (pointX < cellPoint.left) {
            return this.pointToColumnNo(pointX, firstIndex, targetIndex - 1);
        }

        // ターゲットがもっと右側にある
        if (pointX >= cellPoint.right) {
            return this.pointToColumnNo(pointX, targetIndex + 1, lastIndex);
        }

        // 発見
        return targetIndex;
    }

    // Ｙ座標から、行番号を算出する
    pointToRowNo(pointY, firstIndex?, lastIndex?) {

        if ((!firstIndex) && (lastIndex !== 0)) {
            firstIndex = 1;
        }

        if ((!lastIndex) && (lastIndex !== 0)) {
            lastIndex = this.rowHeader.maxCount;
        }

        // 左右が逆転してしまったら、範囲外にはもう無い
        if (firstIndex > lastIndex) {
            return 0;
        }

        // 一区画あたりのセル数（切り上げ）
        const targetIndex = Math.ceil((firstIndex + lastIndex) / 2);
        const cellPoint = this.rowHeader.items.get(targetIndex);

        // ターゲットがもっと上側にある
        if (pointY < cellPoint.top) {
            return this.pointToRowNo(pointY, firstIndex, targetIndex - 1);
        }

        // ターゲットがもっと下側にある
        if (pointY >= cellPoint.bottom) {
            return this.pointToRowNo(pointY, targetIndex + 1, lastIndex);
        }

        // 発見
        return targetIndex;
    }

    // 座標からセル位置を取得する
    pointToTarget(pointX, pointY) {
        const columnNo = this.pointToColumnNo(pointX);
        const rowNo = this.pointToRowNo(pointY);

        return new CellPoint(columnNo, rowNo);
    }

}