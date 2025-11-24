import { Carousel } from "../lib";

const MultipleSlides = () => {
  return (
    <section
      style={{
        maxWidth: "800px",
        margin: "2rem auto",
        padding: "0 1rem",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <h2>Three Slides at Once</h2>
      <Carousel slidesToShow={3} gap={0.5}>
        <Carousel.Track>
          {Array.from({ length: 80 }, (_, i) => (
            <Carousel.Slide key={i}>
              <div
                style={{
                  background: `hsl(${(i * 40) % 360}, 70%, 60%)`,
                  padding: "2rem",
                  color: "white",
                  borderRadius: "8px",
                  textAlign: "center",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                }}
              >
                {i + 1}
              </div>
            </Carousel.Slide>
          ))}
        </Carousel.Track>

        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            gap: "0.5rem",
            justifyContent: "center",
          }}
        >
          <Carousel.PrevButton>← Prev</Carousel.PrevButton>
          <Carousel.NextButton>Next →</Carousel.NextButton>
        </div>
      </Carousel>
    </section>
  );
};

export default MultipleSlides;
