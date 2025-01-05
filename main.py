from flask import Flask, render_template, jsonify, request
import pandas as pd
import json
import os
from datetime import datetime

app = Flask(__name__)

REC_INVEST_FILE = 'recurring_investments.json'
WEEKLY_DEPOSITS_FILE = 'weekly_deposits.json'

def get_data():
    folder_path = 'csvs'
    files = os.listdir(folder_path)
    csv_files = [f for f in files if f.endswith('.csv')]

    # Extract dates from filenames and find the most recent one
    dates = []
    for file in csv_files:
        try:
            date_str = file.split('_')[-1].split('.')[0]
            date = datetime.strptime(date_str, '%b-%d-%Y')
            dates.append((date, file))
        except ValueError:
            continue

    if not dates:
        raise FileNotFoundError("No valid CSV files found in the folder.")

    # Get the file with the most recent date
    latest_file = max(dates, key=lambda x: x[0])[1]
    file_path = os.path.join(folder_path, latest_file)

    df = pd.read_csv(file_path)
    df = df[df['Symbol'] != 'SPAXX**']

    categories = {
        "foundational": ["FXAIX", "VOO", "SCHX", "FZROX", "FNILX", "FSPSX", "WMT", "XLC", "VEA", "XLF", "XLI", "XLE", "FZILX", "CCI", "FREL"],
        "growth": ["SCHG", "NVDA", "PLTR", "QQQM", "FDIS", "FTEC", "VUG", "FBTC", "IBIT", "KRC", "FITLX"],
        "dividend": ["SCHD", "HDV", "LTC", "FSTA", "PLD", "FDVV", "VIG", "DGRO", "SCHH"],
        "bonds": ["SPLB", "VGSH"]
    }

    df = df.dropna(subset=['Account Name'])
    account_category_sums = {account: {category: 0 for category in categories} for account in df['Account Name'].unique()}
    account_table_data = {account: {category: [] for category in categories} for account in df['Account Name'].unique()}

    for account in account_table_data:
        account_table_data[account]['Uncategorized'] = []

    for _, row in df.iterrows():
        account_name = row['Account Name']
        symbol, description, quantity = row['Symbol'], row['Description'], row['Quantity']
        total_gain_loss_dollar, total_gain_loss_percent = row['Total Gain/Loss Dollar'], row['Total Gain/Loss Percent']

        categorized = False
        for category, symbols in categories.items():
            if symbol in symbols:
                account_table_data[account_name][category].append({
                    'Symbol': symbol,
                    'Description': description,
                    'Quantity': quantity,
                    'Total Gain/Loss Dollar': total_gain_loss_dollar,
                    'Total Gain/Loss Percent': total_gain_loss_percent
                })
                account_category_sums[account_name][category] += quantity
                categorized = True
                break

        if not categorized:
            account_table_data[account_name]['Uncategorized'].append({
                'Symbol': symbol,
                'Description': description,
                'Quantity': quantity,
                'Total Gain/Loss Dollar': total_gain_loss_dollar,
                'Total Gain/Loss Percent': total_gain_loss_percent
            })

    return account_category_sums, account_table_data

def load_recurring_investments():
    try:
        with open(REC_INVEST_FILE, 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        return {}

def save_recurring_investment(account_name, symbol, value):
    investments = load_recurring_investments()
    if account_name not in investments:
        investments[account_name] = {}
    investments[account_name][symbol] = value
    with open(REC_INVEST_FILE, 'w') as file:
        json.dump(investments, file)

def load_weekly_deposits():
    try:
        with open(WEEKLY_DEPOSITS_FILE, 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        return {}

def save_weekly_deposit(account_name, weekly_deposit):
    deposits = load_weekly_deposits()
    deposits[account_name] = weekly_deposit
    with open(WEEKLY_DEPOSITS_FILE, 'w') as file:
        json.dump(deposits, file)

@app.route('/')
def index():
    accounts, _ = get_data()
    return render_template('index.html', accounts=accounts.keys())

@app.route('/account/<account_name>')
def account(account_name):
    accounts, _ = get_data()
    return render_template('accounts.html', accounts=accounts.keys(), account_name=account_name)

@app.route('/data/<account_name>')
def data(account_name):
    account_category_sums, account_table_data = get_data()
    recurring_investments = load_recurring_investments()
    return jsonify({
        'chartData': account_category_sums.get(account_name, {}),
        'tableData': account_table_data.get(account_name, {}),
        'recurringInvestments': recurring_investments.get(account_name, {})
    })

@app.route('/investment_data')
def investment_data():
    accounts, _ = get_data()
    recurring_investments = load_recurring_investments()
    weekly_deposits = load_weekly_deposits()

    account_data = []
    for account in accounts.keys():
        auto_investments = sum(float(value) for value in recurring_investments.get(account, {}).values() if value)
        weekly_deposit = weekly_deposits.get(account, 0)
        account_data.append({
            'name': account,
            'weeklyDeposit': weekly_deposit,
            'autoInvestments': auto_investments
        })

    return jsonify({'accounts': account_data})

@app.route('/save_weekly_deposit', methods=['POST'])
def save_weekly_deposit_route():
    data = request.get_json()
    account_name = data['account_name']
    weekly_deposit = data['weekly_deposit']
    save_weekly_deposit(account_name, weekly_deposit)
    return '', 204

@app.route('/save_recurring_investment', methods=['POST'])
def save_recurring():
    data = request.get_json()
    account_name = data['account_name']
    symbol = data['symbol']
    value = data['value']
    save_recurring_investment(account_name, symbol, value)
    return '', 204

if __name__ == '__main__':
    app.run(debug=True)
