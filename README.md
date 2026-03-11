# 🌸 Flower Collect & Billing App

A professional, full-stack ready billing application for flower collection businesses. This app manages members, daily collection entries, variable market rates, and generates PDF invoices.

## ✨ Features

- **Dashboard**: Visual analytics of total weight, gross value, commissions, and net payable.
- **Member Management**: Add farmers/members with photos, mobile numbers, and locations.
- **Daily Entries**: Log daily flower weight (kg) for each member.
- **Rate Manager**: Set daily market rates. Supports "First Half" (1-15) and "Second Half" (16-End) bulk rate updates.
- **Smart Billing**: Automatically calculates totals, commissions, and luggage charges.
- **PDF Export**: Generate professional, printable PDF invoices for each member.
- **Authentication**: Simple built-in secure login system.
- **Theme**: Beautiful Dark Mode & Light Mode support.

## 🚀 Getting Started

### Prerequisites
- **Node.js** installed on your computer.

### Installation

1.  **Open the project folder**:
    ```bash
    cd "Flower Collect App"
    ```

2.  **Install server dependencies**:
    ```bash
    cd server
    npm install
    ```

3.  **Run the Application**:
    ```bash
    node index.js
    ```

4.  **Open in Browser**:
    Go to [http://localhost:3000](http://localhost:3000)

## 🛠️ Configuration

- **Data Storage**: Currently, the app runs in "Standalone Mode" using your browser's LocalStorage. Data will persist on this computer/browser.
- **Database (Optional)**: The backend is ready for PostgreSQL.
    - Set up a PostgreSQL database using `server/schema.sql`.
    - Configure `server/.env` with your DB credentials.
    - *Note: To switch to full Database mode, the frontend `script.js` needs to be connected to the API endpoints provided in `server/index.js`.*

## 📝 Usage Guide

1.  **Sign Up**: Create an admin account on the first screen.
2.  **Add Members**: Go to the **Members** tab and register your farmers.
3.  **Set Rates**: Go to **Settings & Rates** (or click "Manage Rates" in Entries). Set the market price for the days.
4.  **Enter Weights**: In **Daily Entries**, log the kilos collected for each member.
5.  **Generate Bills**: Go to **Generate Bills**, select the month and period (1st or 2nd half).
6.  **Download PDF**: Click "Download" to get the invoice for any member.

---
**Developed by Antigravity**
