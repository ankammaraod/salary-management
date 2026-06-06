# Product Requirements Document — ACME Salary Management

**Date:** 2026-06-06
**Author:** HR Product Team
**Status:** Approved

---

## Goal

Build a web-based salary management tool that lets ACME's HR Manager maintain accurate employee compensation data and answer key questions about how the organization pays its people.

---

## Problem

ACME's HR team manages salary records for 10,000 employees across multiple countries entirely in spreadsheets. This creates three concrete problems:

1. **Findability** — locating and updating a single employee record across large sheets is slow and error-prone
2. **Insight latency** — answering compensation questions (e.g., "what do we pay engineers in Germany?") requires manual pivot tables that quickly go stale
3. **Scale** — at 10,000 employees, spreadsheets hit practical limits; filtering, sorting, and cross-referencing across sheets breaks down

---

## User Persona

**The HR Manager at ACME org** — single user, non-technical, works from a desktop browser. Spends time both maintaining employee records (reactive: new hires, raises, departures) and answering compensation questions from leadership and hiring managers (analytical). This person defines and maintains compensation data but does not run payroll or manage benefits.

---

## Employee Data Model

| Field | Type | Notes |
|---|---|---|
| id | System-generated | |
| name | Text | |
| email | Text | Unique |
| gender | Enum | Male / Female / Other |
| role | Text | Job title |
| department | Text | Business unit |
| country | Text | Also determines salary currency |
| salary | Number | In the country's local currency |
| employment_type | Enum | Full-time / Contractor |
| joining_date | Date | |

Salary is stored in the employee's local currency. Currency is derived from country via a fixed reference map — no FX conversion anywhere in the system.

---

## Scope & Features

### Feature 1 — Project Scaffold + DB Schema

Bootstrap the full monorepo: `server/` (Express + TypeScript) and `client/` (React + Vite + TypeScript) each with their own `package.json`. Set up Knex with the initial migration creating the `employees` table. Docker and docker-compose configured for local development. A health check endpoint (`GET /api/health`) confirms the server is running.

### Feature 2 — Seed Script

Script that populates 10,000 realistic employees spread across multiple countries, departments, and roles with plausible salary ranges in local currencies. Built early so all subsequent features have real data to develop and verify against.

### Feature 3 — Employee Management (CRUD)

- **Create** — add a new employee with all fields
- **View** — read-only detail page per employee
- **Edit** — update any field on an existing employee
- **Delete** — hard delete with a confirmation dialog before deletion

### Feature 4 — Employee List (home screen)

Paginated table of all 10,000 employees showing: ID, name, email, role, department, country, salary, employment type, joining date. Each row links to the employee detail view.

### Feature 5 — Global Search

Single global search box on the employee list — matches against ID, name, email, role, department, and country. Salary is explicitly excluded from search.

### Feature 6 — Salary Insights

A dedicated page with a country selector (defaults to "Select a country"). Once a country is selected, the following are shown:

**Workforce overview**
- Total headcount in country
- Gender breakdown — headcount by gender (Male / Female / Other)
- Employment type breakdown — headcount by Full-time / Contractor

**Compensation summary**
- Average salary, minimum salary, maximum salary (in local currency)
- Total payroll cost (sum of all salaries in the country)

**Department breakdown**
- Table of each department present in the country with headcount and average salary

### Feature 7 — Bulk CSV Upload

HR Manager uploads a CSV file matching a downloadable template. The system:
1. Validates each row (required fields, valid country, valid employment type)
2. Shows a pre-import summary: rows to be imported, rows with errors, error details
3. On confirm, inserts valid rows; skips errored rows
4. Provides a downloadable error report for failed rows

---

## Deliberately Out of Scope

| Excluded | Reasoning |
|---|---|
| Payroll processing | Paying employees is a separate financial system. This tool manages compensation data only. |
| Salary history / audit log | Version tracking adds significant complexity. Current data accuracy is the immediate need. V2 candidate. |
| Advanced filtering & sorting | Global search covers the majority of lookup needs. Column filters and sort controls are a future enhancement. |
| FX / currency conversion | Salary is stored in local currency per country. Cross-currency comparison without live FX rates is misleading. |
| Benefits & bonuses | Separate compensation domain outside the core problem being solved. |
| Authentication & roles | Single-user tool for this scope. Auth adds infrastructure complexity without product value at this stage. |
| Mobile / responsive design | HR managers use desktop browsers for data-heavy work. |
| Cross-country salary comparison | Salaries are in different local currencies — comparing them without FX conversion is not meaningful. Insights stay within-country. |
| HRIS integrations / API connectors | Direct system integrations are out of scope. CSV upload covers the migration path from spreadsheets. |

---

## Technical Constraints

- **Backend:** Javascript & Nodejs with a relational database (SQLite)
- **Frontend:** ReactJS with a component library
- **Seed:** Script generating 10,000 employees
- **Deployment:** Fully functional, runnable locally
