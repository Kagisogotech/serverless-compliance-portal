# Serverless Enterprise Compliance Portal

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4.svg?style=for-the-badge&logo=google&logoColor=white)
![Chart.js](https://img.shields.io/badge/chart.js-F5788D.svg?style=for-the-badge&logo=chart.js&logoColor=white)

> **Note:** This repository is a sanitized, white-labeled clone of a proprietary enterprise application built for a global holding company. Sensitive data, specific branding, and internal logic have been removed or replaced with dummy data.

## 🚀 Overview
The **Compliance Portal** is a custom, serverless web application designed to manage Occupational Health & Safety (OHS) documentation across multiple global subsidiaries. 

Built entirely within the Google Workspace ecosystem, it leverages **Google Apps Script** as the backend, **Google Sheets** as a lightweight NoSQL database, and **Google Drive** for secure blob storage. This architecture results in a highly scalable, enterprise-grade application with **$0 in hosting costs**.

## 🎥 System Preview
*(Insert a GIF or video here showing the login, dashboard, omni-search, and folder upload process)*

## ✨ Key Features

* **Universal Omni-Search:** A real-time, global search engine that queries the entire database, allowing users to jump directly to any document or folder across all regions and subsidiaries instantly.
* **Asynchronous Batch Uploads:** Engineered a custom file-chunking and Base64 encoding system. Users can drag-and-drop entire folders containing dozens of files, which are processed safely with breathing timeouts and a dynamic UI progress bar to prevent browser UI freezing.
* **Role-Based Access Control (RBAC):** Secure authentication flow via Google Workspace. Validates the active user's session email against a registered database to grant either "System Admin" (upload/delete/edit rights) or "View-Only" access based on geographic region.
* **Dynamic Brand UI:** The frontend automatically calculates hex-color contrast to dynamically style UI cards for different subsidiary companies, ensuring text remains readable (switching between dark blue and white) based on the specific brand's background color.
* **Automated Expiry Tracking & KPIs:** Integrates `Chart.js` to calculate overall system health, visualizing active vs. expired documents, and automatically generating a 30-day "Expiring Soon" alert table.

## 🏗️ Architecture & Tech Stack

* **Frontend:** Vanilla HTML, CSS, and JavaScript. Utilizes CSS Flexbox/Grid for a responsive layout and CSS animations for a modern, frosted-glass UI.
* **Backend:** Google Apps Script (`Code.gs`). Handles API routing, Drive folder creation, file blob conversion, and database manipulation.
* **Database:** Google Sheets API. Acts as a relational database to track file metadata, regional tags, and expiration dates.
* **Storage:** Google Drive API. Automatically generates structured folder trees and securely stores Base64 decoded files.

## 💡 Technical Highlights
* **Optimistic UI Deletions:** When an admin deletes a document, the UI is updated optimistically in the browser before the backend confirmation resolves, resulting in a perceived latency of 0ms.
* **Self-Healing Database:** The backend features `try/catch` error boundary handlers that detect corrupted or partially uploaded rows in the Google Sheet and bypasses them to prevent critical UI crashes.

## ⚙️ Local Setup (For Demonstration)

1. Create a new Google Sheet and a new Google Drive Folder.
2. Open **Extensions > Apps Script** in the Google Sheet.
3. Paste the contents of `Code.gs` into the script editor.
4. Replace `SHEET_ID` and `MAIN_FOLDER_ID` at the top of the file with your specific IDs.
5. Create an `Index.html` file in the script editor and paste the frontend code.
6. Click **Deploy > New Deployment**, set it as a Web App, and execute as "User accessing the web app."
