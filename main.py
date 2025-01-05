from flask import Flask, render_template, jsonify
import pandas as pd

app = Flask(__name__)

def get_data():
    file_path = 'Portfolio_Positions_Jan-03-2025.csv'
    df = pd.read_csv(file_path)
    df = df[df['Symbol'] != 'SPAXX**']

    categories = {
        "foundational": ["FXAIX", "VOO", "SCHX", "FZROX", "FNILX", "FSPSX"],
        "growth": ["SCHG", "NVDA", "PLTR", "QQQM", "FDIS", "FTEC", "VUG", "FBTC", "IBIT"],
        "dividend": ["SCHD", "HDV", "LTC", "FSTA", "PLD", "FDVV", "VIG", "DGRO"],
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

@app.route('/')
def index():
    accounts, _ = get_data()
    return render_template('index.html', accounts=accounts.keys(), account_name=list(accounts.keys())[0])

@app.route('/account/<account_name>')
def account(account_name):
    accounts, _ = get_data()
    return render_template('index.html', accounts=accounts.keys(), account_name=account_name)

@app.route('/data/<account_name>')
def data(account_name):
    account_category_sums, account_table_data = get_data()
    return jsonify({
        'chartData': account_category_sums.get(account_name, {}),
        'tableData': account_table_data.get(account_name, {})
    })

if __name__ == '__main__':
    app.run(debug=True)
