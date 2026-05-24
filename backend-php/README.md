# PHP Backend Server for College Management System

This is the PHP migration of the original Express.js backend API, built using **Slim 4** and **Eloquent ORM**. It connects directly to your existing Supabase PostgreSQL database and supports all frontend actions without affecting current features.

---

## Prerequisites (Windows Setup)

Since `php` and `composer` were not detected in your command line path, follow these quick steps to set them up:

### 1. Install PHP (8.2 or 8.3)
1. Download the **VS16 x64 Non Thread Safe** zip file from [PHP for Windows](https://windows.php.net/download/).
2. Extract the zip to a folder (e.g., `C:\php`).
3. Rename `php.ini-development` inside `C:\php` to `php.ini`.
4. Open `php.ini` in a text editor, find the following extensions and uncomment them (remove the `;` at the beginning):
   ```ini
   extension_dir = "ext"
   extension=curl
   extension=mbstring
   extension=openssl
   extension=pdo_pgsql
   extension=pgsql
   extension=fileinfo
   ```
5. Add `C:\php` to your Windows System environment **PATH** variables:
   - Search for **"Edit the system environment variables"** in the Windows Start menu.
   - Click **Environment Variables**.
   - Under **System Variables**, find the `Path` variable and click **Edit**.
   - Click **New** and add `C:\php`.
   - Click **OK** to save and close. Restart your terminals/editors for it to take effect.

### 2. Install Composer
1. Download and run the **Composer-Setup.exe** installer from [getcomposer.org](https://getcomposer.org/download/).
2. It will automatically detect your PHP installation path (`C:\php\php.exe`). Follow the steps to finish installation.
3. Open a new terminal and type `composer -v` to check that it is working.

---

## Project Execution Guide

Once PHP and Composer are set up, run the following steps to start your backend.

### 1. Install Dependencies
Open a PowerShell window in `backend-php` and run:
```powershell
composer install
```

### 2. Test Connection
You can test the connection to your Supabase Postgres database by running:
```powershell
php check_teachers.php
```
If it displays a teacher count and logs, your database config is 100% correct!

### 3. Start the Socket.io Event Bridge
Since Socket.io is a Node.js protocol, the React frontend connects to a lightweight node service for real-time notifications on port 5001.
Open a terminal in the original `backend` folder and run:
```powershell
node socket_bridge.js
```
*(Ensure port 5001 is open; the React client is already updated to connect here.)*

### 4. Start the PHP Slim API Server
Open a terminal in the `backend-php` directory and run the PHP built-in server on port 5000:
```powershell
php -S localhost:5000 -t public
```

---

## File Structure

*   [`public/index.php`](file:///c:/Users/noorl/Desktop/Haris/backend-php/public/index.php): Contains the API routes, JWT auth logic, and Dynamic Table fetching (GET, POST, PUT, DELETE).
*   [`src/Database.php`](file:///c:/Users/noorl/Desktop/Haris/backend-php/src/Database.php): Connects and boots Eloquent.
*   [`src/Models/`](file:///c:/Users/noorl/Desktop/Haris/backend-php/src/Models): Contains all 14 models mapping to Postgres tables.
*   [`src/Middleware/AuthMiddleware.php`](file:///c:/Users/noorl/Desktop/Haris/backend-php/src/Middleware/AuthMiddleware.php): Authenticates request header JWTs.
*   [`src/SocketBridge.php`](file:///c:/Users/noorl/Desktop/Haris/backend-php/src/SocketBridge.php): Helper to post notification events to the node socket server on port 5001.
*   [`src/NotificationService.php`](file:///c:/Users/noorl/Desktop/Haris/backend-php/src/NotificationService.php): Houses the business rules for automatically dispatching email/student alerts.
