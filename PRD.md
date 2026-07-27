• Admin login — Admin has full/super access. 
• User login — Users have limited access based on permissions. 
• Guest mode — Guests can only view Members and Events. 
• Profile management — Every user/admin can create and update their profile after logging in 
• Profile fields include: 
•	Name 
•	Address 
•	Contact number 
•	Photograph 
•	Date of birth 
•	Email ID 
•	Business details 
• The profile information is saved and can be updated later. 
• We were going to design the frontend as well as backend so you could present a basic working concept to the client.
Role	Access
Guest	View selected public information such as Members and Events
User / Member	Login, manage own profile, view permitted members/events, use member features
Admin	Full system access, manage users, members, events, content, and settings

Authentication & Login
Functional requirements:
•	User shall be able to log in using registered credentials. 
•	Admin shall be able to log in using admin credentials. 
•	System shall validate credentials before granting access. 
•	System shall display appropriate error messages for invalid login attempts. 
•	User shall be able to log out. 
•	Session/token shall be invalidated after logout. 
•	Passwords shall be securely stored using encryption/hashing. 
•	System shall support password reset functionality.
User Registration / Member Creation
Depending on the final business process, registration can either be open to users or controlled by Admin.
Functional requirements:
•	User shall be able to register using required information. 
•	System shall validate mandatory fields. 
•	System shall prevent duplicate email IDs/mobile numbers where applicable. 
•	New users may be marked as Pending Approval. 
•	Admin shall be able to approve or reject registrations. 
•	Approved users shall receive access to the application. 
•	Admin shall be able to create users directly. 
•	Admin shall be able to activate/deactivate users.

User Profile Management
Each registered user/member shall have a profile.
Profile information:
•	Name 
•	Profile photograph 
•	Date of birth 
•	Email ID 
•	Contact number 
•	Address 
•	Business details 
Functional requirements:
•	User shall be able to view their profile. 
•	User shall be able to edit their profile. 
•	User shall be able to upload/update their photograph. 
•	System shall validate profile information. 
•	System shall save updated profile information. 
•	User shall be able to update their information at any time. 
•	Certain fields, such as email or mobile number, may require verification after change. 
•	Admin shall be able to view user profiles. 
•	Admin shall be able to edit user profiles if required. 
•	Admin shall be able to deactivate a user. 
•	Profile changes shall be recorded with updated date/time.

Member Directory
The Member Directory will be one of the major features, especially because it is accessible to guests.
Functional requirements:
•	Guest users shall be able to view the member directory. 
•	Logged-in users shall be able to view permitted member information. 
•	Members shall be displayed in a searchable/list format. 
•	Users shall be able to search members by name. 
•	Users shall be able to filter members by relevant criteria. 
•	Users shall be able to open a member's profile. 
•	The system shall display only information permitted for public/member viewing.

Events Management
Events should be visible to guests and authenticated users according to access rules.
Functional requirements:
•	Guest users shall be able to view available events. 
•	Users shall be able to view event details. 
•	Event information may include: 
o	Event name 
o	Date 
o	Time 
o	Venue 
o	Address/location 
o	Description 
o	Event image/banner 
o	Organizer details 
o	Registration deadline 
•	Admin shall be able to create events. 
•	Admin shall be able to edit events. 
•	Admin shall be able to cancel or delete events. 
•	Admin shall be able to publish/unpublish events. 
•	Events may have statuses such as: 
o	Upcoming 
o	Ongoing 
o	Completed 
o	Cancelled 
•	Users may optionally register for events. 
•	Admin shall be able to view event registrations.
Admin Dashboard
The Admin Dashboard will be the central control panel.
Functional requirements:
•	Admin shall be able to view a summary of the system. 
•	Dashboard may display: 
o	Total members 
o	Active members 
o	Pending registrations 
o	Upcoming events 
o	Total event registrations 
o	Recent users 
•	Admin shall be able to navigate to all management modules. 
•	Admin shall be able to manage users and members. 
•	Admin shall be able to manage events. 
•	Admin shall be able to manage application content. 
•	Admin shall be able to access reports.
Admin User Management
Functional requirements:
•	Admin shall be able to view all registered users. 
•	Admin shall be able to search and filter users. 
•	Admin shall be able to create users. 
•	Admin shall be able to edit users. 
•	Admin shall be able to activate/deactivate users. 
•	Admin shall be able to change user roles, subject to authorization. 
•	Admin shall be able to reset user passwords. 
•	Admin shall be able to view user activity/status.

