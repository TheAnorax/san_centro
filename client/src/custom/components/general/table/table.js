import React from "react";
import "../../general/table/table.css";

const Table = ({ data }) => {
  return (
    <div className="table-wrapper">
      <table className="responsive-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th>Fecha de arrivo</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td>{row.sku}</td>
              <td>{row.descripcion}</td>
              <td>{row.cantidad}</td>
              <td>{row.fechaArrivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
