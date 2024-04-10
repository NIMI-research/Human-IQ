from abc import ABC, abstractmethod
from typing import Union
from langchain.schema import AgentAction, AgentFinish
import regex as re

class BaseOutputParser(ABC):
    @abstractmethod
    def parse(self, llm_output: str, user_q) -> Union[AgentAction, AgentFinish]:
        pass
#Class to handle action agent inputs and Observations.
class CustomOutputParser(BaseOutputParser):
    def parse(self, llm_output: str, user_q) -> Union[AgentAction, AgentFinish]:
        if "Final Answer:" in llm_output:
            return AgentFinish(
                return_values={"output": llm_output.split("Final Answer:")[-1].strip()},
                log=llm_output,
            )
        
        regex_action = r"Action:(.*?)(?=\s*Action Input:|$)"
        regex_action_input = r"Action Input:(.*)"
        match_action = re.search(regex_action, llm_output, re.DOTALL)
        match_action_input = re.search(regex_action_input, llm_output, re.DOTALL)
        
        if match_action is None and match_action_input is None:
            return AgentFinish(
                return_values={"output": "No valid action found."},
                log=llm_output,
            )
        
        action = match_action.group(1).strip("\n").strip()
        action_input = match_action_input.group(1).strip("\n").strip()
        
        return AgentAction(tool=action, tool_input=action_input, log=llm_output)
