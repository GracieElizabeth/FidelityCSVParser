let currentEditCategory = null;
let currentEditIndex = null;

async function fetchBudgetData() {
    try {
        const response = await fetch('/budget_data');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        updateBudgetUI(data);
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function updateBudgetUI(data) {
    updateBudgetTables(data);
    updateCategoryDropdown(data);
    updateCategoryTotalsTable(data);
    updateBudgetSummary(data);
}

function updateBudgetTables(data) {
    const tablesDiv = document.getElementById('budget-tables');
    tablesDiv.innerHTML = '';

    Object.keys(data).forEach(category => {
        const categoryContainer = createCategoryContainer(category, data[category]);
        tablesDiv.appendChild(categoryContainer);
    });
}

function createCategoryContainer(category, items) {
    const categoryContainer = document.createElement('div');
    categoryContainer.className = 'category-container';

    const categoryHeader = document.createElement('h2');
    categoryHeader.textContent = category;
    categoryContainer.appendChild(categoryHeader);

    const table = createCategoryTable(items, category);
    categoryContainer.appendChild(table);
    
    return categoryContainer;
}

function createCategoryTable(items, category) {
    const table = document.createElement('table');
    table.className = 'budget-table';
    table.appendChild(createTableHeader());

    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
        const row = createBudgetTableRow(item, category, index);
        fragment.appendChild(row);
    });
    table.appendChild(fragment);

    return table;
}

function createTableHeader() {
    const headers = ['Description', 'Amount', 'Frequency', 'Necessary', 'Actions'];
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    return headerRow;
}

function createBudgetTableRow(item, category, index) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${item.description}</td>
        <td>$${item.amount.toFixed(2)}</td>
        <td>${formatFrequency(item.frequency)}</td>
        <td>${item.necessary ? 'Yes' : 'No'}</td>
        <td class="button-container">
            <button onclick="editPayment('${category}', ${index})">Edit</button>
            <button onclick="deletePayment('${category}', ${index})">Delete</button>
        </td>
    `;
    return row;
}

function formatFrequency(frequency) {
    const [frequencyNumber, frequencyUnit] = frequency.split(' ');
    return `${frequencyNumber} ${frequencyUnit}${frequencyNumber > 1 ? 's' : ''}`;
}

function updateCategoryTotalsTable(data) {
    const totalsTableBody = document.getElementById('category-totals-table').querySelector('tbody');
    totalsTableBody.innerHTML = '';

    const categoryTotals = calculateCategoryTotals(data);
    Object.keys(categoryTotals).forEach(category => {
        const row = createCategoryTotalsRow(category, categoryTotals[category]);
        totalsTableBody.appendChild(row);
    });
}

function calculateCategoryTotals(data) {
    const categoryTotals = {};

    Object.keys(data).forEach(category => {
        let monthlyTotal = 0;
        let weeklyTotal = 0;

        data[category].forEach(item => {
            const monthlyAmount = calculateMonthlyAmount(item);
            monthlyTotal += monthlyAmount;
            weeklyTotal += monthlyAmount / 4.33; 
        });

        categoryTotals[category] = {
            monthly: monthlyTotal,
            weekly: weeklyTotal,
            necessary: data[category].some(item => item.necessary)
        };
    });

    return categoryTotals;
}

function calculateMonthlyAmount(item) {
    const [frequencyNumber, frequencyUnit] = item.frequency.split(' ');
    const amount = item.amount;

    switch (frequencyUnit) {
        case 'week':
        case 'weeks':
            return (amount * frequencyNumber) * 4.33;
        case 'month':
        case 'months':
            return amount / frequencyNumber;
        case 'year':
        case 'years':
            return amount / (frequencyNumber * 12);
        default:
            return amount / frequencyNumber;
    }
}

function createCategoryTotalsRow(category, totals) {
    const row = document.createElement('tr');
    row.setAttribute('data-category', category);
    row.innerHTML = `
        <td>${category}</td>
        <td>$${totals.monthly.toFixed(2)}</td>
        <td>$${totals.weekly.toFixed(2)}</td>
    `;
    row.addEventListener('click', () => toggleCategoryDetails(category));
    return row;
}

function toggleCategoryDetails(category) {
    const existingDetails = document.querySelectorAll(`.details[data-category="${category}"]`);
    
    if (existingDetails.length > 0) {
        existingDetails.forEach(detail => detail.remove());
    } else {
        const data = fetchBudgetData(); 
        data.then(items => {
            items[category].forEach(item => {
                const detailsRow = createCategoryDetailsRow(category, item);
                const categoryRow = document.querySelector(`tr[data-category="${category}"]`);
                categoryRow.insertAdjacentElement('afterend', detailsRow);
            });
        });
    }
}

function createCategoryDetailsRow(category, item) {
    const row = document.createElement('tr');
    row.className = 'details';
    row.setAttribute('data-category', category);
    row.style.backgroundColor = '#f0f0f0';
    row.innerHTML = `
        <td>${item.description}</td>
        <td>$${item.amount.toFixed(2)}</td>
        <td>${formatFrequency(item.frequency)}</td>
    `;
    return row;
}

function updateBudgetSummary(data) {
    const summaryDiv = document.getElementById('budget-summary');
    summaryDiv.innerHTML = '';

    const { totalMonthlyPayments, totalMonthlySpending } = calculateTotals(data);
    const totalWeeklyPayments = totalMonthlyPayments / 4.33;
    const totalWeeklySpending = totalMonthlySpending / 4.33;

    const weeklyIncome = 735.08;
    const monthlyIncome = weeklyIncome * 4.33;

    summaryDiv.innerHTML = `
        <p>Monthly Income After Tax: $${monthlyIncome.toFixed(2)}</p>
        <p>Weekly Income After Tax: $${weeklyIncome}</p>
        <br>
        <p>Necessary Monthly Payments: $${totalMonthlyPayments.toFixed(2)}</p>
        <p>Necessary Weekly Payments: $${totalWeeklyPayments.toFixed(2)}</p>
        <p>Total Monthly Spending: $${totalMonthlySpending.toFixed(2)}</p>
        <p>Total Weekly Spending: $${totalWeeklySpending.toFixed(2)}</p>
    `;
}

function calculateTotals(data) {
    let totalMonthlyPayments = 0;
    let totalMonthlySpending = 0;

    Object.values(data).flat().forEach(item => {
        const monthlyAmount = calculateMonthlyAmount(item);
        totalMonthlySpending += monthlyAmount;
        if (item.necessary) totalMonthlyPayments += monthlyAmount;
    });

    return { totalMonthlyPayments, totalMonthlySpending };
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
    const paymentData = gatherPaymentFormData();
    const response = await sendPaymentRequest('/save_budget', paymentData);
    if (response.ok) {
        fetchBudgetData(); // Reload budget data to update the UI
        resetForm(); // Reset the form
    }
}

async function updatePayment(event) {
    event.preventDefault();
    const paymentData = gatherPaymentFormData();
    paymentData.currentEditCategory = currentEditCategory;
    paymentData.currentEditIndex = currentEditIndex;

    const response = await sendPaymentRequest('/update_budget', paymentData);
    if (response.ok) {
        fetchBudgetData(); // Reload budget data to update the UI
        resetForm(); // Reset the form
    }
}

async function sendPaymentRequest(url, paymentData) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
    });
    return response;
}

function gatherPaymentFormData() {
    const category = document.getElementById('category').value === 'new'
        ? document.getElementById('new-category').value
        : document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const frequencyNumber = parseInt(document.getElementById('frequency-number').value);
    const frequencyUnit = document.getElementById('frequency-unit').value;
    const frequency = `${frequencyNumber} ${frequencyUnit}`;
    const necessary = document.getElementById('necessary').checked;

    return { category, description, amount, frequency, necessary };
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
        fetchBudgetData(); // Reload budget data to update the UI
    }
}

function resetForm() {
    document.getElementById('add-payment-form').reset();
    document.getElementById('new-category').style.display = 'none';
    document.getElementById('add-payment-form').removeEventListener('submit', updatePayment);
    document.getElementById('add-payment-form').addEventListener('submit', addPayment);
}

function editPayment(category, index) {
    currentEditCategory = category;
    currentEditIndex = index;

    const data = fetchBudgetData(); 
    data.then(items => {
        const item = items[category][index];
        document.getElementById('description').value = item.description;
        document.getElementById('amount').value = item.amount;
        document.getElementById('category').value = category;
        document.getElementById('frequency-number').value = item.frequency.split(' ')[0];
        document.getElementById('frequency-unit').value = item.frequency.split(' ')[1];
        document.getElementById('necessary').checked = item.necessary;
    });

    document.getElementById('add-payment-form').removeEventListener('submit', addPayment);
    document.getElementById('add-payment-form').addEventListener('submit', updatePayment);
}

document.getElementById('category').addEventListener('change', (e) => {
    if (e.target.value === 'new') {
        document.getElementById('new-category').style.display = 'block';
    } else {
        document.getElementById('new-category').style.display = 'none';
    }
});

document.getElementById('add-payment-form').addEventListener('submit', addPayment);
document.addEventListener('DOMContentLoaded', fetchBudgetData);
