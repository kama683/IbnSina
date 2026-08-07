import json
from pathlib import Path

from fastapi import APIRouter, Depends, Query

from app.deps import require_roles
from app.models.employee import EmployeeRole

router = APIRouter()

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "icd10_common.json"
_CODES: list[dict[str, str]] = json.loads(_DATA_PATH.read_text(encoding="utf-8"))

# "Осмотр: заполнение" в матрице плана — справочник МКБ-10 нужен только тому,
# кто ставит диагноз.
_VIEW_EXAMINATION = require_roles(EmployeeRole.doctor, EmployeeRole.head_doctor)


@router.get("", dependencies=[Depends(_VIEW_EXAMINATION)])
def search_icd10(q: str = Query("", min_length=0)):
    query = q.strip().lower()
    if not query:
        return []

    results = []
    for item in _CODES:
        haystack = f"{item['code']} {item['name']}".lower()
        if query in haystack:
            results.append(item)
        if len(results) >= 10:
            break
    return results
