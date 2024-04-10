from typing import List
from langchain.chains import LLMChain
from langchain.agents import AgentOutputParser
from base_agent import BaseAgent

# Edited the base class from langchain to adapt to accessing user question.
# Customize this class for more functionality.
class CustomAgent(BaseAgent):
    llm_chain: LLMChain
    output_parser: AgentOutputParser
    stop: List[str]

    @property
    def input_keys(self) -> List[str]:
        return list(set(self.llm_chain.input_keys) - {"intermediate_steps"})

    def dict(self, **kwargs: Any) -> Dict:
        _dict = super().dict()
        del _dict["output_parser"]
        return _dict

    def plan(self, intermediate_steps, callbacks=None, **kwargs):
        output = self.llm_chain.run(
            intermediate_steps=intermediate_steps,
            stop=self.stop,
            callbacks=callbacks,
            **kwargs,
        )
        user_question = kwargs.pop("input")
        return self.output_parser.parse(output, user_question)

    async def aplan(self, intermediate_steps, callbacks=None, **kwargs):
        output = await self.llm_chain.arun(
            intermediate_steps=intermediate_steps,
            stop=self.stop,
            callbacks=callbacks,
            **kwargs,
        )
        user_question = kwargs.pop("input")
        return self.output_parser.parse(output, user_question)

    def tool_run_logging_kwargs(self):
        return {
            "llm_prefix": "",
            "observation_prefix": "" if len(self.stop) == 0 else self.stop[0],
        }
