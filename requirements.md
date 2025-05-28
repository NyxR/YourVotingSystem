## User Role in Voting System

- Super Admin : Can create admin, can see all voting session on the app
- Admin: Can create Agent and assign them to a voting session, can only view session created by himself
- Agent: Can upload voting result on an assigned voting session

## Functionality

### Authentication

- User can only login on the app
- There is no register functionality
- User (Agent or Admin) get an invite by email
- Once the user clicked on the email, he should redirect to a page where he can setup his own password

### As an Super Admin

- Can create Admin
- Can view list of Admin
- Can edit or remove an Admin
- Can view list of all created voting session
- Can remove voting session
- Can view list of Agent
- Can edit or remove an Agent
- Can view result for all voting session
- Can view result for specific voting session

### As an Admin

- Can create voting session
- Can edit or remove voting session
- Can view created voting session by him
- Can create voting item for a session
- Can edit or remove voting item for a session
- Can view created voting item for all created session by him
- Can create agent accounts
- Can assign agent to a specific voting session
- Can view agent list
- Can edit or remove agent from a voting session
- Can see voting result for all created session by him
- Can select and view voting result for a session

### As an Agent

- Can view assigned voting sessions
- Can entered in assigned voting session and input result for each voting items

## Models

- User
- VotingSession
- VotingItem
