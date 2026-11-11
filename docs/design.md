User Table:
Id                                 - Primary key
first_name, last_name              - Your “two names”;
email (unique), phone              - How the person can be reached and can log in
password_hash                      - Scrambled password, never the real one
role                               - customer or admin
neighbourhood_id                   - Foreign key to neighbourhoods
notify_sms, notify_email           - Notification choices
created_at                         - When the account was made


County         Town                      Neighbourhood 
id             id                        id
Name           county_id(foreign key)    name of Neighbourhood
               name of town              Town_id(foreign key)






outage_reports table
id                             -Primary key
user_id                        -Who reported (foreign key to users)
incident_id	                   -Which incident this report belongs to 
neighbourhood_id               -Where the user says it is (foreign key)
started_at
description
neighbours_affected	           -True/false, from the form in your document
created_at	



outage_incident table
id                              Primary Key
neighbourhood_id	            Where the incident is (foreign key)
cause_id                    	Foreign key to causes
cause_confirmed	                False means suspected, true means confirmed
is_planned	                    Planned maintenance or unexpected
status	                        reported, under_investigation or restored
started_at	                    When the incident began
estimated_restoration_at	    Current estimate (can change)
restored_at	                    Actual restoration, empty until restored
created_at	                    When the incident was created


Causes Table
cause_id




























