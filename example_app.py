import streamlit as st
from struggle_annotator import txt_annotator

text = (
    "Yesterday, at 3 PM, Emily Johnson and Michael Smith met at the Central Park "
    "in New York to discuss the merger between TechCorp and Global Solutions.\n\n"
    "The deal, worth approximately 500 million dollars, is expected to "
    "significantly impact the tech industry. Later, at 6 PM, they joined a "
    "conference call with the CEO of TechCorp, David Brown, who was in London "
    "for a technology summit. During the call, they discussed the market trends "
    "in Asia and Europe and planned for the next quarterly meeting, which is "
    "scheduled for January 15th, 2024, in Paris."
)

label_dict = {
    "Personal names": {"color": "#E53935"},
    "Organizations":  {"color": "#1E88E5"},
    "Locations":      {"color": "#73BF77"},
    "Time":           {"color": "#FB8C00"},
    "Money":          {"color": "#AB55C2"},
}

st.title("Struggle Annotator")
result = txt_annotator(text, label_dict)
st.json(result)
