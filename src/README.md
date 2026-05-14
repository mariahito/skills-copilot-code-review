# Mergington High School Activities API

A FastAPI application that allows students to browse activities and allows signed-in teachers to manage registrations and announcements.

## Features

- View all available extracurricular activities
- Sign up and unregister students for activities (teacher sign-in required)
- View active school announcements from the database
- Create, update, and delete announcements (teacher sign-in required)

## Getting Started

1. Install the dependencies:

   ```
   pip install -r requirements.txt
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/activities` | Get all activities with optional day/time filtering |
| GET | `/activities/days` | Get all days with scheduled activities |
| POST | `/activities/{activity_name}/signup?email=student@mergington.edu&teacher_username={username}` | Register a student for an activity |
| POST | `/activities/{activity_name}/unregister?email=student@mergington.edu&teacher_username={username}` | Remove a student from an activity |
| POST | `/auth/login?username={username}&password={password}` | Sign in as teacher/admin |
| GET | `/auth/check-session?username={username}` | Validate user session by username |
| GET | `/announcements` | Get active announcements for the public UI |
| GET | `/announcements?include_all=true&teacher_username={username}` | Get all announcements for admin dialog |
| POST | `/announcements?teacher_username={username}` | Create an announcement |
| PUT | `/announcements/{announcement_id}?teacher_username={username}` | Update an announcement |
| DELETE | `/announcements/{announcement_id}?teacher_username={username}` | Delete an announcement |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Teachers** - Uses username as identifier:
   - Display name
   - Password hash
   - Role

3. **Announcements** - Uses generated identifier:
   - Message text
   - Optional start date
   - Required expiration date
   - Created and updated metadata

Data is stored in MongoDB and seeded with example records on first initialization.
