import { driver, type DriveStep } from "driver.js";
import sendRequest from "@/lib/request";

import "driver.js/dist/driver.css";

const steps = {
    "dash_users": [
        {
            element: "[data-tour-target='users_create']",
            popover: {
                title: "Creating Users",
                description: "You can either create a single user or upload a CSV file to create multiple users at once",
            },
        },
        {
            element: "[data-tour-target='users_filter']",
            popover: {
                title: "Filtering Users",
                description: "You can search for users by name and filter by role, duty status or restrictions",
            },
        },
        {
            element: "[data-tour-target='users_table']",
            popover: {
                title: "User Table",
                description: "Here you can see a list of all users in the system. You can click on the 3 dots to the right of a user to view or edit their details or delete them",
                onNextClick: (_, __, { driver: tour}) => {
                    // select the first user in the table and click the view details button
                    const first_row = document.querySelector("table tbody tr") as HTMLTableRowElement;
                    if (first_row) {
                        const view_details_button = first_row.querySelector("[data-user-action='view']") as HTMLButtonElement;
                        if (view_details_button) view_details_button.click();
                    }

                    tour.moveNext();
                }
            },
        },
        {
            element: "[data-tour-target='users_details']",
            popover: {
                title: "User Details",
                description: "Here you can see a detailed view of a user's details. You can view this modal by clicking View Details in the three dots menu on the right of a user in the table",
                onNextClick: (_, __, { driver: tour}) => {
                    // click the edit button to open the edit modal
                    const edit_button = document.querySelector("#userEditButton") as HTMLButtonElement;
                    if (edit_button) edit_button.click();

                    tour.moveNext();
                },
            },
        },
        {
            element: "[data-tour-target='users_edit']",
            popover: {
                title: "Editing User Details",
                description: "Here you can edit a user's details. You can change the username, password, name, role, on duty status and restrictions. You can also delete a user by clicking the delete button in the three dots menu on the right of a user in the table",
                onNextClick: (_, __, { driver: tour}) => {
                    // close the user edit modal
                    closeModal("userEditModal");

                    tour.moveNext();
                },
            },
        },
        {
            popover: {
                title: "Thats everything!",
                description: "You have completed the tutorial! You can view this tutorial again at any time by click your name in the top right and then Tutorial",
            },
        }
    ],
    "dash_passes": [
        {
            element: "[data-tour-target='passes_filter']",
            popover: {
                title: "Filtering Passes",
                description: "You can filter by location, duration or state",
            },
        },
        {
            element: "[data-tour-target='passes_table']",
            popover: {
                title: "Pass Table",
                description: "Here you can see a list of all passes in the system. You can click on the 3 dots to the right of a pass to view or edit their details or delete them",
                onNextClick: (_, __, { driver: tour}) => {
                    // select the first pass in the table and click the view details button
                    const first_row = document.querySelector("table tbody tr") as HTMLTableRowElement;
                    if (first_row) {
                        const view_details_button = first_row.querySelector("[data-pass-action='view']") as HTMLButtonElement;
                        if (view_details_button) view_details_button.click();
                    }

                    tour.moveNext();
                }
            },
        },
        {
            element: "[data-tour-target='passes_details']",
            popover: {
                title: "Pass Details",
                description: "Here you can see a detailed view of a pass's details. You can view this modal by clicking View Details in the three dots menu on the right of a pass in the table",
                onNextClick: (_, __, { driver: tour}) => {
                    // close the modal
                    closeModal("passDetailsModal");

                    tour.moveNext();
                },
            },
        },
        {
            popover: {
                title: "Thats everything!",
                description: "You have completed the tutorial! You can view this tutorial again at any time by click your name in the top right and then Tutorial",
            },
        }
    ],
    "dash_restrictions": [
        {
            element: "[data-tour-target='restrictions_create']",
            popover: {
                title: "Creating Restrictions",
                description: "You can create a new restriction by filling out the form",
            },
        },
        {
            element: "[data-tour-target='restrictions_filter']",
            popover: {
                title: "Filtering Restrictions",
                description: "You can filter by type, status or location",
            },
        },
        {
            element: "[data-tour-target='restrictions_table']",
            popover: {
                title: "Restriction Table",
                description: "Here you can see a list of all restrictions in the system. You can click on the 3 dots to the right of a restriction to view, edit or delete it.",
                onNextClick: (_, __, { driver: tour}) => {
                    // select the first restriction in the table and click the view details button
                    const first_row = document.querySelector("table tbody tr") as HTMLTableRowElement;
                    if (first_row) {
                        const view_details_button = first_row.querySelector("[data-restriction-action='view']") as HTMLButtonElement;
                        if (view_details_button) view_details_button.click();
                    }

                    tour.moveNext();
                }
            },
        },
        {
            element: "[data-tour-target='restrictions_details']",
            popover: {
                title: "Restriction Details",
                description: "Here you can see a detailed view of a restriction's details. You can view this modal by clicking View Details in the three dots menu on the right of a restriction in the table",
                onNextClick: (_, __, { driver: tour}) => {
                    // click the edit button to open the edit modal
                    const edit_button = document.querySelector("#restrictionEditButton") as HTMLButtonElement;
                    if (edit_button) edit_button.click();

                    tour.moveNext();
                },
            },
        },
        {
            element: "[data-tour-target='restrictions_edit']",
            popover: {
                title: "Editing Restriction Details",
                description: "Here you can edit a restriction's details. You can change the name, type, amount, TTL, location and interval.",
                onNextClick: (_, __, { driver: tour}) => {
                    // close the restriction edit modal
                    closeModal("restrictionEditModal");

                    tour.moveNext();
                },
            },
        },
        {
            popover: {
                title: "Thats everything!",
                description: "You have completed the tutorial! You can view this tutorial again at any time by click your name in the top right and then Tutorial",
            },
        }
    ],
    "dash_groupings": [
        {
            element: "[data-tour-target='groupings_filter']",
            popover: {
                title: "Filtering Groupings",
                description: "You can filter by state, location or created date",
            },
        },
        {
            element: "[data-tour-target='groupings_table']",
            popover: {
                title: "Grouping Table",
                description: "Here you can see a list of all groupings in the system. You can click on the 3 dots to the right of a grouping to view or edit their details or delete them",
                onNextClick: (_, __, { driver: tour}) => {
                    // select the first grouping in the table and click the view details button
                    const first_row = document.querySelector("table tbody tr") as HTMLTableRowElement;
                    if (first_row) {
                        const view_details_button = first_row.querySelector("[data-grouping-action='view']") as HTMLButtonElement;
                        if (view_details_button) view_details_button.click();
                    }

                    tour.moveNext();
                }
            },
        },
        {
            element: "[data-tour-target='groupings_details']",
            popover: {
                title: "Grouping Details",
                description: "Here you can see a detailed view of a grouping's details. You can view this modal by clicking View Details in the three dots menu on the right of a grouping in the table",
                onNextClick: (_, __, { driver: tour}) => {
                    closeModal("groupingDetailsModal");

                    tour.moveNext();
                },
            },
        },
        {
            popover: {
                title: "Thats everything!",
                description: "You have completed the tutorial! You can view this tutorial again at any time by click your name in the top right and then Tutorial",
            },
        }
    ],
} as Record<string, DriveStep[]>;

export function start(type: keyof typeof steps) {
    const tour = driver({
        showProgress: true,
        steps: steps[type]!,
        
        onDestroyed: async() => {
            const request = await sendRequest<void>("users/@me/tours/" + type, "POST");
            if (!request.success) {
                console.log("Failed to save tour completion");
                console.log(request.error);
            }
        }
    });
    tour.drive();
}