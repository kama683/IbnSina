from app.crud.medication import create_medication, get_medication, list_medications


def test_create_and_get_medication(db_session):
    med = create_medication(db_session, name="Paracetamol", code="PARA-500", unit="таб", manufacturer="Acme", min_stock_level=10)
    assert med.id is not None
    fetched = get_medication(db_session, med.id)
    assert fetched is not None
    assert fetched.name == "Paracetamol"


def test_list_medications(db_session):
    meds = list_medications(db_session)
    assert isinstance(meds, list)
