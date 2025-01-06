let currentEditCategory = null;
let currentEditIndex = null;

async function fetchBudgetData() {
    try {
        const response = await fetch('/budget_data');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        updateBudgetTables(data);
        updateCategoryDropdown(data);
        updateCategoryTotalsTable(data);
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function updateBudgetTables(data) {
    const tablesDiv = document.getElementById('budget-tables');
    tablesDiv.innerHTML = '';

    Object.keys(data).forEach(category => {
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'category-container';

        const categoryHeader = document.createElement('h2');
        categoryHeader.textContent = category;
        categoryContainer.appendChild(categoryHeader);

        const table = document.createElement('table');
        table.className = 'budget-table';

        const headers = ['Description', 'Amount', 'Frequency', 'Necessary', 'Actions'];
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        const fragment = document.createDocumentFragment();
        data[category].forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.description}</td>
                <td>$${item.amount.toFixed(2)}</td>
                <td>${item.frequency.split(' ')[0]} ${item.frequency.split(' ')[1]}${item.frequency.split(' ')[0] > 1 ? 's' : ''}</td>
                <td>${item.necessary ? 'Yes' : 'No'}</td>
                <td class="button-container">
                    <button onclick="editPayment('${category}', ${index})">Edit</button>
                    <button onclick="deletePayment('${category}', ${index})">Delete</button>
                </td>
            `;
            fragment.appendChild(row);
        });

        table.appendChild(fragment);
        categoryContainer.appendChild(table);
        tablesDiv.appendChild(categoryContainer);
    });

    updateBudgetSummary(data);
}

function updateCategoryTotalsTable(data) {
    const totalsTableBody = document.getElementById('category-totals-table').querySelector('tbody');
    totalsTableBody.innerHTML = '';

    const categoryTotals = {};

    Object.keys(data).forEach(category => {
        let monthlyTotal = 0;
        let weeklyTotal = 0;

        data[category].forEach(item => {
            const [frequencyNumber, frequencyUnit] = item.frequency.split(' ');
            const amount = item.amount;

            let monthlyAmount;
            if (frequencyUnit.includes('week')) {
                monthlyAmount = (amount * frequencyNumber * 52) / 12;
            } else if (frequencyUnit.includes('month')) {
                monthlyAmount = amount * frequencyNumber;
            } else if (frequencyUnit.includes('year')) {
                monthlyAmount = (amount * frequencyNumber) / 12;
            } else {
                monthlyAmount = amount;
            }

            monthlyTotal += monthlyAmount;
            weeklyTotal += monthlyAmount / 4.33;
        });

        categoryTotals[category] = {
            monthly: monthlyTotal,
            weekly: weeklyTotal,
            necessary: data[category].some(item => item.necessary)
        };
    });

    Object.keys(categoryTotals).forEach(category => {
        const row = document.createElement('tr');
        row.setAttribute('data-category', category);
        row.innerHTML = `
            <td>${category}</td>
            <td>$${categoryTotals[category].monthly.toFixed(2)}</td>
            <td>$${categoryTotals[category].weekly.toFixed(2)}</td>
            <td>${categoryTotals[category].necessary ? 'Yes' : 'No'}</td>
        `;
        row.addEventListener('click', () => toggleCategoryDetails(category, data[category]));
        totalsTableBody.appendChild(row);
    });
}

function toggleCategoryDetails(category, items) {
    const existingDetails = document.querySelectorAll(`.details[data-category="${category}"]`);
    if (existingDetails.length > 0) {
        existingDetails.forEach(detail => detail.remove());
        return;
    }

    items.forEach(item => {
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'details';
        detailsRow.setAttribute('data-category', category);
        detailsRow.style.backgroundColor = '#f0f0f0';

        detailsRow.innerHTML = `
            <td>${item.description}</td>
            <td>$${item.amount.toFixed(2)}</td>
            <td>${item.frequency.split(' ')[0]} ${item.frequency.split(' ')[1]}${item.frequency.split(' ')[0] > 1 ? 's' : ''}</td>
            <td>${item.necessary ? 'Yes' : 'No'}</td>
        `;

        const categoryRow = document.querySelector(`tr[data-category="${category}"]`);
        categoryRow.insertAdjacentElement('afterend', detailsRow);
    });
}

function updateBudgetSummary(data) {
    const summaryDiv = document.getElementById('budget-summary');
    summaryDiv.innerHTML = '';

    let totalMonthlyPayments = 0;
    let totalMonthlySpending = 0;

    Object.values(data).flat().forEach(item => {
        const [frequencyNumber, frequencyUnit] = item.frequency.split(' ');
        const amount = item.amount;

        const monthlyAmount = frequencyUnit.includes('week') ? (amount / 7) * 30 * frequencyNumber :
                              frequencyUnit.includes('month') ? amount * frequencyNumber :
                              (amount / 12) * frequencyNumber;

        totalMonthlySpending += monthlyAmount;
        if (item.necessary) totalMonthlyPayments += monthlyAmount;
    });

    const totalWeeklyPayments = totalMonthlyPayments / 4.33;
    const totalWeeklySpending = totalMonthlySpending / 4.33;

    summaryDiv.innerHTML = `
        <p>Necessary Monthly Payments: $${totalMonthlyPayments.toFixed(2)}</p>
        <p>Necessary Weekly Payments: $${totalWeeklyPayments.toFixed(2)}</p>
        <p>Total Weekly Spending: $${totalWeeklySpending.toFixed(2)}</p>
    `;
}

function updateCategoryDropdown(data) {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = `
        <option value="" disabled selected>Select a category</option>
        ${Object.keys(data).map(category => `<option value="${category}">${category}</option>`).join('')}
        <option value="new">New Category</option>
    `;
}

async function addPayment(event) {
    event.preventDefault();

    let category = document.getElementById('category').value;
    if (category === 'new') {
        category = document.getElementById('new-category').value;
    }
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const frequencyNumber = parseInt(document.getElementById('frequency-number').value);
    const frequencyUnit = document.getElementById('frequency-unit').value;
    const frequency = `${frequencyNumber} ${frequencyUnit}`;
    const necessary = document.getElementById('necessary').checked;

    const response = await fetch('/save_budget', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category, description, amount, frequency, necessary }),
    });

    if (response.ok) {
        fetchBudgetData();
        resetForm();
    }
}

async function editPayment(category, index) {
    const data = await fetchBudgetData();
    const item = data[category][index];

    document.getElementById('category').value = category;
    document.getElementById('description').value = item.description;
    document.getElementById('amount').value = item.amount;
    const [frequencyNumber, frequencyUnit] = item.frequency.split(' ');
    document.getElementById('frequency-number').value = frequencyNumber;
    document.getElementById('frequency-unit').value = frequencyUnit;
    document.getElementById('necessary').checked = item.necessary;

    currentEditCategory = category;
    currentEditIndex = index;

    document.getElementById('add-payment-form').removeEventListener('submit', addPayment);
    document.getElementById('add-payment-form').addEventListener('submit', updatePayment);
}

async function updatePayment(event) {
    event.preventDefault();

    let category = document.getElementById('category').value;
    if (category === 'new') {
        category = document.getElementById('new-category').value;
    }
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const frequencyNumber = parseInt(document.getElementById('frequency-number').value);
    const frequencyUnit = document.getElementById('frequency-unit').value;
    const frequency = `${frequencyNumber} ${frequencyUnit}`;
    const necessary = document.getElementById('necessary').checked;

    const response = await fetch('/update_budget', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category, description, amount, frequency, necessary, currentEditCategory, currentEditIndex }),
    });

    if (response.ok) {
        fetchBudgetData();
        resetForm();
    }
}

async function deletePayment(category, index) {
    const response = await fetch('/delete_budget', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category, index }),
    });

    if (response.ok) {
        fetchBudgetData();
    }
}

function resetForm() {
    document.getElementById('category').value = '';
    document.getElementById('new-category').value = '';
    document.getElementById('new-category').style.display = 'none';
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('frequency-number').value = '';
    document.getElementById('frequency-unit').value = 'week';
    document.getElementById('necessary').checked = false;

    document.getElementById('add-payment-form').removeEventListener('submit', updatePayment);
    document.getElementById('add-payment-form').addEventListener('submit', addPayment);

    currentEditCategory = null;
    currentEditIndex = null;
}

document.getElementById('category').addEventListener('change', function() {
    const newCategoryInput = document.getElementById('new-category');
    if (this.value === 'new') {
        newCategoryInput.style.display = 'block';
    } else {
        newCategoryInput.style.display = 'none';
    }
});

document.getElementById('add-payment-form').addEventListener('submit', addPayment);
document.addEventListener('DOMContentLoaded', fetchBudgetData);
