import pandas as pd
import matplotlib.pyplot as plt


def process_csv(file_path):
    # Load the CSV file into a DataFrame and filter out rows with 'SPAXX**'
    df = pd.read_csv(file_path)
    df = df[df['Symbol'] != 'SPAXX**']

    # Define investment categories with their symbols
    categories = {
        "foundational": ["FXAIX", "VOO", "SCHX", "FZROX", "FNILX", "FSPSX"],
        "growth": ["SCHG", "NVDA", "PLTR", "QQQM", "FDIS", "FTEC", "VUG", "FBTC", "IBIT"],
        "dividend": ["SCHD", "HDV", "LTC", "FSTA", "PLD", "FDVV", "VIG", "DGRO"],
        "bonds": ["SPLB", "VGSH"]
    }

    # Filter out rows with NaN account names
    df = df.dropna(subset=['Account Name'])

    # Initialize a dictionary to store total quantities for each category per account
    account_category_sums = {account: {category: 0 for category in categories} for account in
                             df['Account Name'].unique()}

    # Sum quantities for each investment category per account
    for _, row in df.iterrows():
        if 'The data and information in this spreadsheet' in str(row):
            break
        account_name = row['Account Name']
        symbol = row['Symbol']
        quantity = row['Quantity']

        for category, symbols in categories.items():
            if symbol in symbols:
                account_category_sums[account_name][category] += quantity

    # Create a pie chart for each account
    for account_name, category_sums in account_category_sums.items():
        # Filter out categories with a total quantity of 0
        total_quantities = {category: quantity for category, quantity in category_sums.items() if quantity > 0}
        labels = list(total_quantities.keys())
        sizes = list(total_quantities.values())

        plt.figure(figsize=(10, 7))
        plt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=140)
        plt.axis('equal')
        plt.title(f'Investment Categories Distribution for Account: {account_name}')
        plt.show()


# Call the function with the CSV file path
process_csv('Portfolio_Positions_Jan-03-2025.csv')
