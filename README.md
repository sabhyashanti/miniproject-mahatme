# miniproject-mahatme
1. Backend Setup
Bash
cd backend
npm install
Create a .env file in the backend directory:

Code snippet
PORT=5000
DATABASE_URL=your_postgresql_connection_string
EMAIL_USER=your_hospital_email@gmail.com
EMAIL_PASS=your_gmail_app_password
Start the backend server:

Bash
node server.js
# Or use nodemon: npm run dev
2. Frontend Setup
Bash
cd ../frontend
npm install
Note: Update the fetch() URLs in the React components to point to http://localhost:5000 for local development, or your live Render URL.

Start the React app:

Bash
npm start
📖 Usage Flow
Initialize Admin: Create the first Admin user directly in your PostgreSQL database.

Login: Access the system via the generated OTP.

Register Staff: Use the Admin dashboard to add Doctors and Receptionists.

Launch TV: Click "Launch TV" from the Admin overview to open the Digital Signage simulation on a secondary monitor.

Flow Check: Register a Walk-in patient from the Receptionist dashboard and watch them instantly appear on the TV and Doctor dashboards!

👨‍💻 Team & Contributions
Developed by a 5-member team:

Lead Developer / Full Stack Architect: Core system logic, queue rotation algorithms, full-stack integration.

Frontend Developer (Dashboards): UI/UX for Admin, Receptionist, and Doctor panels, form validation, queue sorting.

Frontend Developer (Digital Signage): TV loop mechanics, media player integration, emergency UI.

Backend Developer (Auth & APIs): Express routing, CORS, Nodemailer OTP system.

Database Administrator (DBA): PostgreSQL schemas, data integrity, deployment management.

Built for modern healthcare efficiency.
"""

file_path = "/mnt/data/README.md"
with open(file_path, "w") as file:
file.write(readme_content)

print(f"File saved to {file_path}")
