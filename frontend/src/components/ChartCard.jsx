import React from "react";

export default function ChartCard({ title, value }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 text-center">
      <h3 className="font-semibold mb-2 border-b pb-1">{title}</h3>
      <p className="text-3xl font-bold text-blue-600">{value}</p>
    </div>
  );
}
