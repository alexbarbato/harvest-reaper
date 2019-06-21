from datetime import datetime, timedelta
from requests import post, get
import pytz

from harvestreaper.settings import HARVEST_CLIENT_ID, HARVEST_CLIENT_SECRET

HARVEST_AUTH_URL = 'https://id.getharvest.com'
HARVEST_API_URL = 'https://api.harvestapp.com/api/v2'


def get_harvest_token(code, code_key, grant_type):
    request_data = {
        code_key: code,
        'client_id': HARVEST_CLIENT_ID,
        'client_secret': HARVEST_CLIENT_SECRET,
        'grant_type': grant_type
    }
    response = post(
        f'{HARVEST_AUTH_URL}/api/v2/oauth2/token', json=request_data)
    json = response.json()

    # Save the token for use later!
    return json.get('access_token'), json.get('refresh_token'), pytz.UTC.localize(datetime.utcnow() + timedelta(seconds=json.get('expires_in')))


# API
def get_harvest_account(token):
    headers = {
        'Authorization': f'Bearer {token.token}'
    }

    response = get(f'{HARVEST_AUTH_URL}/api/v2/accounts',
                   headers=headers)
    accounts_list = response.json().get('accounts')
    for account in accounts_list:
        if account.get('name').lower() == 'istrategylabs':
            return account.get('id')


def get_user_id(token, account_id):
    headers = {
        'Authorization': f'Bearer {token.token}',
        'Harvest-Account-Id': str(account_id)
    }

    user_info = get(f'{HARVEST_API_URL}/users/me', headers=headers)
    return user_info.json().get('id', '')


def get_harvest_assignments(token, account_id, user_id):
    headers = {
        'Authorization': f'Bearer {token.token}',
        'Harvest-Account-Id': str(account_id)
    }

    response = get(f'{HARVEST_API_URL}/users/{user_id}/project_assignments',
                   headers=headers)
    project_assignments = response.json().get('project_assignments', [])

    projects_list = []
    for assign in project_assignments:
        client = assign.get('client', {})
        client_name = client.get('name', '')
        proj = assign.get('project', {})
        project_id = proj.get('id', 0)
        project_name = proj.get('name', '')

        project_with_assignments = {
            'project_id': project_id,
            'project_name': f'{client_name} {project_name}',
            'assignments': []
        }
        for task_assign in assign.get('task_assignments', []):
            task = task_assign.get('task', {})
            project_with_assignments['assignments'].append({
                'task_id': task.get('id', 0),
                'name': f'{task.get("name", "")}'
            })
        projects_list.append(project_with_assignments)

    return projects_list


def post_harvest_time_entry(token, account_id, project_id, task_id, spent_date, hours):
    headers = {
        'Authorization': f'Bearer {token.token}',
        'Harvest-Account-Id': str(account_id)
    }

    time_data = {
        'project_id': project_id,
        'task_id': task_id,
        'spent_date': spent_date.isoformat(),
        'hours': hours
    }
    created_entry = post(f'{HARVEST_API_URL}/time_entries',
                         headers=headers, json=time_data)

    return created_entry
