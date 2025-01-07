async function fetchInvestmentData() {
    const response = await fetch('/investment_data');
    const data = await response.json();
    updateInvestmentTables(data.accounts);
}

function updateInvestmentTables(accounts) {
    const tablesDiv = document.getElementById('investment-tables');
    tablesDiv.innerHTML = '';

    accounts.forEach(account => {
        const tableContainer = document.createElement('div');
        tableContainer.innerHTML = `
            <h2>${account.name}</h2>
            <table class="investment-table">
                <tr>
                    <th>Weekly Direct Deposit</th>
                    <th>Total Weekly Auto Investments</th>
                    <th>Leftover to Invest per Week</th>
                    <th>Monthly Investments</th>
                    <th>Yearly Investments</th>
                </tr>
                <tr>
                    <td><input type="number" value="${account.weeklyDeposit || 0}" onchange="saveWeeklyDeposit('${account.name}', this.value)"></td>
                    <td>$${account.autoInvestments.toFixed(2)}</td>
                    <td>$${(account.weeklyDeposit - account.autoInvestments).toFixed(2)}</td>
                    <td>$${(account.weeklyDeposit * 4.33).toFixed(2)}</td>
                    <td>$${(account.weeklyDeposit * 52).toFixed(2)}</td>
                </tr>
            </table>
        `;
        tablesDiv.appendChild(tableContainer);
    });
}

async function saveWeeklyDeposit(accountName, value) {
    await fetch('/save_weekly_deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_name: accountName, weekly_deposit: value }),
    });
    fetchInvestmentData(); // Refresh the data after saving
}

document.addEventListener('DOMContentLoaded', fetchInvestmentData);

document.getElementById('fileUpload').addEventListener('change', function () {
    let fileName = this.files[0] ? this.files[0].name : 'No file chosen';
    document.getElementById('fileName').textContent = 'Selected file: ' + fileName;
});

document.getElementById('uploadForm').addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent default form submission

    let fileInput = document.getElementById('fileUpload');
    let file = fileInput.files[0];

    if (file && file.type === 'text/csv') {
        let formData = new FormData();
        formData.append('fileUpload', file);

        fetch('/upload_csv', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('File uploaded successfully!');
            } else {
                alert('Error uploading file.');
            }
        })
        .catch(err => {
            alert('Error: ' + err.message);
        });
    } else {
        alert('Please upload a valid CSV file.');
    }
});