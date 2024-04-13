from abc import ABC, abstractmethod
from langchain.agents import AgentExecutor
from langchain.chat_models import ChatOpenAI
from langchain.callbacks import get_openai_callback
from custom_agent import CustomAgent
from output_parser import CustomOutputParser
from prompt_template import CustomPromptTemplate
from template_construction import TemplateConstruction
from langchain import LLMChain
from langchain import PromptTemplate

class BaseLangchainImpl(ABC):
    @abstractmethod
    def get_tools(self):
        pass

    @abstractmethod
    def get_prompt(self, question, dynamic, DPP):
        pass

    @abstractmethod
    def answer_ques(self, ques):
        pass

    @abstractmethod
    def get_template_inference(self, out, int_answer):
        pass

    @abstractmethod
    def execute_agent(self, question):
        pass

class LangchainImpl(BaseLangchainImpl):
    def __init__(self, dataset, model_name, tool_provider, dynamic, DPP):
        self.dataset = dataset
        self.model_name = model_name
        self.tool_provider = tool_provider
        self.dynamic = dynamic
        self.DPP = DPP

    def get_tools(self):
        return self.tool_provider.get_tools()

    def get_prompt(self, question, dynamic, DPP):
        workflow = ""
        if DPP:
            workflow = f"{workflow}{TemplateConstruction(question, self.dataset).few_shot_with_dpp()}"
        if dynamic:
            workflow = f"{workflow}{TemplateConstruction(question, self.dataset, div=True).full_shot_with_diversity()}"
        else:
            workflow = f"{workflow}{TemplateConstruction(question, self.dataset).static_prompt_construction()}"

        prepend_template = """Given the question, your task is to find the answer using the provided tools.
Your immediate steps include finding relevant information to answer the question using {tools} provided.
You have access to the following - {tools}!.
Once you have the answer, always follow the specific format to output the final answer -
Final Answer: Answer
Here are three examples to look at on how to use the {tools}\n"""

        additional_template = """
You have access to the following - {tools}!
Use the following format:
Question: the input question for which you must provide a natural language answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Final Answer: the final answer to the original input question
Question: {input}
{agent_scratchpad}
        """

        workflow = workflow.strip("\n")
        complete_workflow = f"{prepend_template}{workflow}\n\n{additional_template.strip()}"

        prompt = CustomPromptTemplate(
            template=complete_workflow.strip("\n"),
            tools=self.get_tools(),
            input_variables=["input", "intermediate_steps"],
        )
        return prompt

    def answer_ques(self, ques):
        template = """Given a question your task is to answer the question, please do not provide any other information other than the answer.
                    Question: {ques}
                    Answer: """
        prompt = PromptTemplate(template=template, input_variables=["ques"])
        llm = ChatOpenAI(model_name = self.model_name, temperature=0)
        llm_chain = LLMChain(prompt=prompt, llm=llm)
        return llm_chain.run(ques)

    def get_template_inference(self, out, int_answer):
        complete_steps = ""
        for i in out.get("intermediate_steps"):
            thought = ""
            if "Thought:" in i[0].log:
                complete_steps = f"{complete_steps}\n{thought}{i[0].log}\nObservation:{i[1]}\n"
            else:
                thought = "Thought: "
                complete_steps = f"{complete_steps}\n{thought}{i[0].log}\nObservation:{i[1]}\n"
        final_string = """Thought: I now know the final answer.\nFinal Answer: """
        complete_steps = f'{out.get("input")}\n{complete_steps}\n{final_string}{out.get("output")}, Internal Knowledge: {int_answer}'
        return complete_steps

    def execute_agent(self, question):
        llm = ChatOpenAI(model_name=self.model_name, temperature=0, request_timeout=300)
        prompt = self.get_prompt(question, self.dynamic, self.DPP)
        llm_chain = LLMChain(llm=llm, prompt=prompt)
        tools = self.get_tools()
        tool_names = [tool.name for tool in tools]
        output_parser = CustomOutputParser()
        agent = CustomAgent(
            llm_chain=llm_chain,
            output_parser=output_parser,
            stop=["\nObservation:"],
            allowed_tools=tool_names,
        )
        agent_executor = AgentExecutor.from_agent_and_tools(
            agent=agent,
            tools=tools,
            verbose=True,
            handle_parsing_errors=True,
            return_intermediate_steps=True,
        )
        internal_answer = self.answer_ques(question)
        with get_openai_callback() as cb:
            out = agent_executor(question)
            answer_template_for_inference = self.get_template_inference(out, internal_answer)
        return out, answer_template_for_inference, cb.completion_tokens
