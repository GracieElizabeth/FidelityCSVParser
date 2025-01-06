from flask import Flask, render_template, jsonify, request
import pandas as pd
import json
import os
from datetime import datetime

app = Flask(__name__)

class DataLoader:
    def __init__(self, folder_path='csvs'):
        self.folder_path = folder_path

    def get_data(self):
        files = [f for f in os.listdir(self.folder_path) if f.endswith('.csv')]
        dates = [(datetime.strptime(f.split('_')[-1].split('.')[0], '%b-%d-%Y'), f) for f in files if '_' in f and f.split('_')[-1].split('.')[0]]
        if not dates:
            raise FileNotFoundError("No valid CSV files found in the folder.")
        latest_file = max(dates, key=lambda x: x[0])[1]
        df = pd.read_csv(os.path.join(self.folder_path, latest_file))
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

        for _, row in df.iterrows():
            account_name, symbol, description, quantity = row['Account Name'], row['Symbol'], row['Description'], row['Quantity']
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

class InvestmentManager:
    def __init__(self, rec_invest_file='recurring_investments.json', weekly_deposits_file='weekly_deposits.json'):
        self.rec_invest_file = rec_invest_file
        self.weekly_deposits_file = weekly_deposits_file

    def load_json(self, file):
        try:
            with open(file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}

    def save_json(self, file, data):
        with open(file, 'w') as f:
            json.dump(data, f)

    def load_recurring_investments(self):
        return self.load_json(self.rec_invest_file)

    def save_recurring_investment(self, account_name, symbol, value):
        investments = self.load_recurring_investments()
        investments.setdefault(account_name, {})[symbol] = value
        self.save_json(self.rec_invest_file, investments)

    def load_weekly_deposits(self):
        return self.load_json(self.weekly_deposits_file)

    def save_weekly_deposit(self, account_name, weekly_deposit):
        deposits = self.load_weekly_deposits()
        deposits[account_name] = weekly_deposit
        self.save_json(self.weekly_deposits_file, deposits)

class BudgetManager:
    def __init__(self, budget_file='budget.json'):
        self.budget_file = budget_file

    def load_budget(self):
        try:
            with open(self.budget_file, 'r') as file:
                return json.load(file)
        except FileNotFoundError:
            return {}

    def save_budget(self, budget):
        with open(self.budget_file, 'w') as file:
            json.dump(budget, file)

data_loader = DataLoader()
investment_manager = InvestmentManager()
budget_manager = BudgetManager()

@app.route('/')
def index():
    accounts, _ = data_loader.get_data()
    return render_template('index.html', accounts=accounts.keys())

@app.route('/account/<account_name>')
def account(account_name):
    accounts, _ = data_loader.get_data()
    return render_template('accounts.html', accounts=accounts.keys(), account_name=account_name)

@app.route('/data/<account_name>')
def data(account_name):
    account_category_sums, account_table_data = data_loader.get_data()
    recurring_investments = investment_manager.load_recurring_investments()
    return jsonify({
        'chartData': account_category_sums.get(account_name, {}),
        'tableData': account_table_data.get(account_name, {}),
        'recurringInvestments': recurring_investments.get(account_name, {})
    })

@app.route('/investment_data')
def investment_data():
    accounts, _ = data_loader.get_data()
    recurring_investments = investment_manager.load_recurring_investments()
    weekly_deposits = investment_manager.load_weekly_deposits()

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
    investment_manager.save_weekly_deposit(account_name, weekly_deposit)
    return '', 204

@app.route('/save_recurring_investment', methods=['POST'])
def save_recurring():
    data = request.get_json()
    account_name = data['account_name']
    symbol = data['symbol']
    value = data['value']
    investment_manager.save_recurring_investment(account_name, symbol, value)
    return '', 204

@app.route('/budget')
def budget():
    accounts, _ = data_loader.get_data()
    return render_template('budget.html', accounts=accounts.keys())

@app.route('/budget_data')
def budget_data():
    budget = budget_manager.load_budget()
    return jsonify(budget)

@app.route('/save_budget', methods=['POST'])
def save_budget_route():
    data = request.get_json()
    category = data['category']
    description = data['description']
    amount = data['amount']
    frequency = data['frequency']
    necessary = data['necessary']

    budget = budget_manager.load_budget()
    budget.setdefault(category, []).append({
        'description': description,
        'amount': amount,
        'frequency': frequency,
        'necessary': necessary
    })
    budget_manager.save_budget(budget)
    return '', 204

@app.route('/update_budget', methods=['POST'])
def update_budget_route():
    data = request.get_json()
    category = data['category']
    description = data['description']
    amount = data['amount']
    frequency = data['frequency']
    necessary = data['necessary']
    current_edit_category = data['currentEditCategory']
    current_edit_index = data['currentEditIndex']

    budget = budget_manager.load_budget()
    if current_edit_category in budget and 0 <= current_edit_index < len(budget[current_edit_category]):
        budget[current_edit_category][current_edit_index] = {
            'description': description,
            'amount': amount,
            'frequency': frequency,
            'necessary': necessary
        }
        if current_edit_category != category:
            budget[category].append(budget[current_edit_category].pop(current_edit_index))
            if not budget[current_edit_category]:
                del budget[current_edit_category]
        budget_manager.save_budget(budget)
    return '', 204

@app.route('/delete_budget', methods=['POST'])
def delete_budget_route():
    data = request.get_json()
    category = data['category']
    index = data['index']

    budget = budget_manager.load_budget()
    if category in budget and 0 <= index < len(budget[category]):
        del budget[category][index]
        if not budget[category]:
            del budget[category]
        budget_manager.save_budget(budget)
    return '', 204

if __name__ == '__main__':
    app.run(debug=True)
