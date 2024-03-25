from abc import ABC, abstractmethod
from typing import List
from langchain.tools import Tool

class BaseToolProvider(ABC):
    @abstractmethod
    def get_tools(self) -> List[Tool]:
        pass

class CustomToolProvider(BaseToolProvider):
    def __init__(self, tools: List[Tool]):
        self.tools = tools

    def get_tools(self) -> List[Tool]:
        return self.tools