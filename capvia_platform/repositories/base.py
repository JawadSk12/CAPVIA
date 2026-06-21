from datetime import datetime
from typing import Generic, TypeVar, Type, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from capvia_platform.models.base import Base

T = TypeVar("T", bound=Base)

class BaseRepository(Generic[T]):
    """
    Abstract Generic Repository implementing reusable asynchronous database operations.
    """
    def __init__(self, model_class: Type[T]):
        self.model_class = model_class

    async def get_by_id(self, session: AsyncSession, id_) -> Optional[T]:
        """
        Retrieves a single entity by its primary key ID.
        """
        return await session.get(self.model_class, id_)

    async def list_all(
        self, session: AsyncSession, skip: int = 0, limit: int = 100, include_deleted: bool = False
    ) -> List[T]:
        """
        Lists entities with pagination support, filtering out soft-deleted records by default.
        """
        stmt = select(self.model_class).offset(skip).limit(limit)
        
        # Filter out soft deleted records if the model supports it and include_deleted is False
        if not include_deleted and hasattr(self.model_class, "deleted_at"):
            stmt = stmt.where(self.model_class.deleted_at == None)
            
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, session: AsyncSession, entity: T) -> T:
        """
        Inserts a new entity into the database.
        """
        session.add(entity)
        await session.flush()
        return entity

    async def update(self, session: AsyncSession, entity: T) -> T:
        """
        Updates an existing entity.
        """
        await session.flush()
        return entity

    async def delete(self, session: AsyncSession, id_, soft: bool = True) -> bool:
        """
        Deletes an entity by ID. Supports soft-deletion by setting `deleted_at` 
        or hard-deletion from the database.
        """
        entity = await self.get_by_id(session, id_)
        if not entity:
            return False

        if soft and hasattr(entity, "deleted_at"):
            setattr(entity, "deleted_at", datetime.utcnow())
        else:
            await session.delete(entity)
            
        await session.flush()
        return True
