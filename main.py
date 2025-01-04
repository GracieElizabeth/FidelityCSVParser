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
    account_category_sums = {account: {category: 0 for category in categories} for account in
                             df['Account Name'].unique()}

    for _, row in df.iterrows():
        if 'The data and information in this spreadsheet' in str(row):
            break
        account_name = row['Account Name']
        symbol = row['Symbol']
        quantity = row['Quantity']

        for category, symbols in categories.items():
            if symbol in symbols:
                account_category_sums[account_name][category] += quantity

    return account_category_sums


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/data')
def data():
    account_category_sums = get_data()
    return jsonify(account_category_sums)


if __name__ == '__main__':
    app.run(debug=True)
