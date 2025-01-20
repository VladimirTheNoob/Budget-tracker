import React from 'react';
import { Pie } from 'react-chartjs-2';

const BudgetChart = ({ budget }) => {
  const data = {
    labels: ['Remaining', 'Spent'],
    datasets: [
      {
        data: [budget.remaining, budget.spent],
        backgroundColor: ['#36A2EB', '#FF6384'],
      },
    ],
  };

  return (
    <div>
      <h2>Budget Breakdown</h2>
      <Pie data={data} />
    </div>
  );
};

export default BudgetChart; 