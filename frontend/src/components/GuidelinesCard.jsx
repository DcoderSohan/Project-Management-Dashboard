import React from "react";

export default function GuidelinesCard() {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="font-semibold mb-2 border-b pb-1">Guidelines</h3>
      <ul className="list-disc list-inside text-sm space-y-1">
        <li>For new project entry, submit details using Project Intake Form.</li>
        <li>
          Engineering head will review and approve/reject the request.
        </li>
        <li>
          Once approved, PMO issues project kit as per project number.
        </li>
        <li>
          Project Owner updates resource & activities in toolkit.
        </li>
        <li>
          PMO tracks progress of each project in PMO Metrics for portfolio
          review.
        </li>
      </ul>
    </div>
  );
}
