const categoryColors = {
    foundational: '#1f77b4',
    growth: '#2ca02c',
    dividend: '#9467bd',
    bonds: '#d62728',
    Uncategorized: '#ff7f0e'
};

async function fetchData(accountName) {
    const response = await fetch(`/data/${accountName}`);
    const data = await response.json();
    updateCharts(accountName, data.chartData);
    updateTables(accountName, data.tableData, data.recurringInvestments);
}

function updateCharts(accountName, data) {
    const chartsDiv = document.getElementById('charts');
    if (!chartsDiv) return; // Exit if chartsDiv does not exist

    chartsDiv.innerHTML = '';

    const categories = Object.keys(data).filter(cat => data[cat] > 0);
    const values = categories.map(cat => data[cat]);
    const colors = categories.map(cat => categoryColors[cat]);

    const chartDiv = document.createElement('div');
    chartsDiv.appendChild(chartDiv);

    const chartData = [{
        values: values,
        labels: categories,
        type: 'pie',
        marker: {
            colors: colors
        }
    }];

    const layout = { title: `Investment Categories Distribution for Account: ${accountName}` };
    Plotly.newPlot(chartDiv, chartData, layout);
}

function updateTables(accountName, data, recurringInvestments) {
    const tablesDiv = document.getElementById('tables');
    if (!tablesDiv) return; // Exit if tablesDiv does not exist

    tablesDiv.innerHTML = '';

    const categories = ['foundational', 'growth', 'dividend', 'bonds', 'Uncategorized'];
    categories.forEach(category => {
        const categoryData = data[category];
        if (categoryData.length > 0) {
            const header = document.createElement('h2');
            header.textContent = capitalize(category);
            tablesDiv.appendChild(header);

            const table = createTable();
            let totalGainLossDollar = 0;
            let totalGainLossPercent = 0;
            let totalRecurringInvestment = 0;
            let totalQuantity = 0;

            categoryData.forEach(row => {
                const tr = document.createElement('tr');
                ['Symbol', 'Description', 'Quantity', 'Total Gain/Loss Dollar', 'Total Gain/Loss Percent'].forEach(field => {
                    const td = document.createElement('td');
                    td.textContent = row[field];
                    if (field === 'Quantity') {
                        totalQuantity += parseFloat(row[field]);
                    }
                    if (field === 'Total Gain/Loss Dollar') {
                        const value = parseFloat(row[field].replace(/[^0-9.-]+/g, ""));
                        totalGainLossDollar += value;
                        td.textContent = value < 0 ? `-$${Math.abs(value).toFixed(2)}` : `$${value.toFixed(2)}`;
                        td.style.color = value < 0 ? 'red' : 'green';
                    }
                    if (field === 'Total Gain/Loss Percent') {
                        const value = parseFloat(row[field].replace(/[^0-9.-]+/g, ""));
                        totalGainLossPercent += value;
                        td.style.color = value < 0 ? 'red' : 'green';
                    }
                    tr.appendChild(td);
                });

                const investmentTd = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.placeholder = '0';
                input.value = recurringInvestments[row['Symbol']] || '';
                input.onchange = () => saveInvestment(accountName, row['Symbol'], input.value);
                investmentTd.appendChild(input);
                tr.appendChild(investmentTd);

                if (input.value) {
                    totalRecurringInvestment += parseFloat(input.value);
                }

                table.appendChild(tr);
            });

            // Add the total row
            const totalRow = document.createElement('tr');
            totalRow.className = 'total-row';
            const totalLabelTd = document.createElement('td');
            totalLabelTd.textContent = 'Total';
            totalLabelTd.colSpan = 3;
            totalRow.appendChild(totalLabelTd);

            const totalGainLossDollarTd = document.createElement('td');
            totalGainLossDollarTd.textContent = totalGainLossDollar < 0 ? `-$${Math.abs(totalGainLossDollar).toFixed(2)}` : `$${totalGainLossDollar.toFixed(2)}`;
            totalGainLossDollarTd.style.color = totalGainLossDollar < 0 ? 'red' : 'green';
            totalRow.appendChild(totalGainLossDollarTd);

            const totalGainLossPercentTd = document.createElement('td');
            totalGainLossPercentTd.textContent = (totalGainLossPercent / categoryData.length).toFixed(2);
            totalGainLossPercentTd.style.color = totalGainLossPercent < 0 ? 'red' : 'green';
            totalRow.appendChild(totalGainLossPercentTd);

            const totalRecurringInvestmentTd = document.createElement('td');
            totalRecurringInvestmentTd.textContent = totalRecurringInvestment.toFixed(2);
            totalRow.appendChild(totalRecurringInvestmentTd);

            table.appendChild(totalRow);
            tablesDiv.appendChild(table);
        }
    });
}

function createTable() {
    const table = document.createElement('table');
    table.className = 'investment-table';
    const headerRow = document.createElement('tr');
    const headers = ['Symbol', 'Description', 'Quantity', 'Total Gain/Loss Dollar', 'Total Gain/Loss Percent', 'Recurring Investment ($/week)'];
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    return table;
}

async function saveInvestment(accountName, symbol, value) {
    await fetch('/save_recurring_investment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ account_name: accountName, symbol, value }),
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

document.addEventListener('DOMContentLoaded', () => {
    const accountName = document.querySelector('h1').dataset.accountName;
    if (accountName) {
        fetchData(accountName);
    }
});
