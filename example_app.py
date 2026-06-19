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
    "\n\n\n\nThe deal, worth approximately 500 million dollars, is expected to "
    "significantly impact the tech industry. Later, at 6 PM, they joined a "
    "conference call with the CEO of TechCorp, David Brown, who was in London "
    "for a technology summit. During the call, they discussed the market trends "
    "in Asia and Europe and planned for the next quarterly meeting, which is "
    "scheduled for January 15th, 2024, in Paris."
)

label_dict = {
    "Personal names": {"color": "#FE4545"},
    "Organizations": {"color": "#008000"},
    "Locations": {"color": "#FFA500"},
    "Time": {"color": "#4F4FFF"},
    "Money": {"color": "#33D0D0"},
}

st.title("Struggle Annotator")
with st.expander("Setting", expanded=True):
    col1, col2, col3 = st.columns([1.5, 1.6, 1.5], vertical_alignment="center")
    with col1:
        auto_expand = st.toggle("Auto-expand to full word", value=True, key="auto_expand")
    with col2:
        spacing_val = st.slider("Line spacing", min_value=1.2, max_value=5.0, value=1.9, step=0.1, key="spacing")
    with col3:
        label_position = st.selectbox("Label position", options=["top", "left", "right"], index=0, key="label_position")


result = txt_annotator(text, label_dict, label_position=label_position, spacing=spacing_val, auto_expand=auto_expand, key="annotator")
st.json(result)
