from abc import ABC, abstractmethod
from typing import List, Union, Dict, Any
from langchain.schema import AgentAction, AgentFinish

class BaseAgent(ABC):
    @abstractmethod
    def plan(self, intermediate_steps, callbacks, **kwargs):
        pass

    @abstractmethod
    async def aplan(self, intermediate_steps, callbacks, **kwargs):
        pass

    @abstractmethod
    def tool_run_logging_kwargs(self):
        pass