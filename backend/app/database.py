import time

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(max_attempts: int = 10, delay_seconds: float = 3.0) -> None:
    from app import models  # noqa: F401

    last_error: OperationalError | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            Base.metadata.create_all(bind=engine)
            return
        except OperationalError as exc:
            last_error = exc
            if attempt < max_attempts:
                time.sleep(delay_seconds)
    raise last_error  # type: ignore[misc]
